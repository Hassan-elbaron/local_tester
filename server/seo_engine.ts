/**
 * SEO Engine — Full Audit System
 * Covers: technical SEO, on-page, content gaps, keyword opportunities, priority queue
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { seoAudits, companies } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { buildCompanyContext } from "./knowledge";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function getLatestSeoAudit(companyId: number) {
  const db = await D();
  const rows = await db.select().from(seoAudits)
    .where(eq(seoAudits.companyId, companyId))
    .orderBy(desc(seoAudits.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSeoAudits(companyId: number) {
  const db = await D();
  return db.select().from(seoAudits)
    .where(eq(seoAudits.companyId, companyId))
    .orderBy(desc(seoAudits.createdAt));
}

export async function runSeoAudit(companyId: number, auditType: "technical" | "on_page" | "content" | "competitor_gap" | "full" = "full") {
  const db = await D();

  // Create pending record
  const insertResult = await db.insert(seoAudits).values({
    companyId,
    auditType,
    status: "running",
  });
  const auditId = (insertResult as any)[0]?.insertId ?? (insertResult as any).insertId;

  try {
    const companyRows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    const company = companyRows[0];
    if (!company) throw new Error("Company not found");

    const ctx = await buildCompanyContext(companyId);

    // ── Technical SEO Agent ─────────────────────────────────────────────────
    const technicalResult = await invokeLLM({
      messages: [
        { role: "system", content: "You are an expert Technical SEO Auditor. Analyze the company website and provide a structured technical SEO audit." },
        { role: "user", content: `Company: ${company.name}\nWebsite: ${company.website ?? "not provided"}\nContext: ${ctx}\n\nProvide a technical SEO audit. Respond as JSON:\n{\n  "score": 0-100,\n  "issues": [{ "severity": "critical|high|medium|low", "type": "string", "description": "string", "fix": "string" }],\n  "report": { "mobileOptimized": true/false, "httpsEnabled": true/false, "pageSpeedIssues": [], "crawlabilityIssues": [], "structuredDataMissing": [], "duplicateContent": [], "brokenLinks": [], "sitemapStatus": "string", "robotsTxtStatus": "string" }\n}` },
      ],
      response_format: { type: "json_object" },
    });
    const techRaw = technicalResult.choices[0]?.message?.content;
    const technical = JSON.parse(typeof techRaw === "string" ? techRaw : JSON.stringify(techRaw));

    // ── On-Page SEO Agent ───────────────────────────────────────────────────
    const onPageResult = await invokeLLM({
      messages: [
        { role: "system", content: "You are an On-Page SEO specialist. Analyze the company's content and on-page SEO elements." },
        { role: "user", content: `Company: ${company.name}\nWebsite: ${company.website ?? "not provided"}\nIndustry: ${company.industry ?? "general"}\nContext: ${ctx}\n\nProvide an on-page SEO audit. Respond as JSON:\n{\n  "issues": [{ "severity": "critical|high|medium|low", "type": "string", "description": "string", "fix": "string" }],\n  "report": { "titleTagIssues": [], "metaDescriptionIssues": [], "headingStructureIssues": [], "imageAltTextMissing": [], "internalLinkingIssues": [], "contentLengthIssues": [], "keywordOptimizationGaps": [] }\n}` },
      ],
      response_format: { type: "json_object" },
    });
    const onPageRaw = onPageResult.choices[0]?.message?.content;
    const onPage = JSON.parse(typeof onPageRaw === "string" ? onPageRaw : JSON.stringify(onPageRaw));

    // ── Keyword & Content Opportunities Agent ───────────────────────────────
    const keywordResult = await invokeLLM({
      messages: [
        { role: "system", content: "You are an SEO Content Strategist specializing in keyword research and content gap analysis." },
        { role: "user", content: `Company: ${company.name}\nIndustry: ${company.industry ?? "general"}\nWebsite: ${company.website ?? "not provided"}\nContext: ${ctx}\n\nProvide keyword opportunities and content gaps. Respond as JSON:\n{\n  "keywordOpportunities": [{ "keyword": "string", "volume": "high|medium|low", "difficulty": "easy|medium|hard", "currentRank": "string or null" }],\n  "contentGaps": ["string"],\n  "competitorGaps": ["string"],\n  "priorityQueue": [{ "priority": 1-10, "task": "string", "impact": "high|medium|low", "effort": "low|medium|high" }]\n}` },
      ],
      response_format: { type: "json_object" },
    });
    const kwRaw = keywordResult.choices[0]?.message?.content;
    const keywords = JSON.parse(typeof kwRaw === "string" ? kwRaw : JSON.stringify(kwRaw));

    // Merge all issues
    const allIssues = [
      ...(technical.issues ?? []),
      ...(onPage.issues ?? []),
    ];

    // Calculate overall score
    const criticalCount = allIssues.filter((i: any) => i.severity === "critical").length;
    const highCount = allIssues.filter((i: any) => i.severity === "high").length;
    const score = Math.max(0, (technical.score ?? 70) - criticalCount * 10 - highCount * 3);

    // Opportunities from keyword data
    const opportunities = [
      ...(keywords.contentGaps ?? []).slice(0, 5),
      ...(keywords.competitorGaps ?? []).slice(0, 3),
    ];

    await db.update(seoAudits).set({
      status: "complete",
      score,
      issues: allIssues as any,
      opportunities: opportunities as any,
      technicalReport: technical.report as any,
      onPageReport: onPage.report as any,
      contentGaps: (keywords.contentGaps ?? []) as any,
      keywordOpportunities: (keywords.keywordOpportunities ?? []) as any,
      priorityQueue: (keywords.priorityQueue ?? []) as any,
      url: company.website ?? null,
      updatedAt: new Date(),
    }).where(eq(seoAudits.id, auditId));

    return getLatestSeoAudit(companyId);
  } catch (err) {
    await db.update(seoAudits).set({ status: "failed", updatedAt: new Date() }).where(eq(seoAudits.id, auditId));
    throw err;
  }
}

export async function acknowledgeSeoIssue(companyId: number, auditId: number, issueIndex: number) {
  const db = await D();
  const rows = await db.select().from(seoAudits)
    .where(and(eq(seoAudits.id, auditId), eq(seoAudits.companyId, companyId)))
    .limit(1);
  if (!rows[0]) throw new Error("Audit not found");
  const issues = (rows[0].issues as any[]) ?? [];
  if (issues[issueIndex]) issues[issueIndex].acknowledged = true;
  await db.update(seoAudits).set({ issues: issues as any, updatedAt: new Date() }).where(eq(seoAudits.id, auditId));
}
