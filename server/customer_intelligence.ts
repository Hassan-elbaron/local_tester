/**
 * Customer Intelligence — Objection Map, FAQ Engine, Issue Tracker
 * Extracts and structures customer pain points from various sources
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { customerIssues, companies } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { buildCompanyContext } from "./knowledge";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function getCustomerIssues(companyId: number, issueType?: string) {
  const db = await D();
  const cond = issueType
    ? and(eq(customerIssues.companyId, companyId), eq(customerIssues.issueType, issueType as any))
    : eq(customerIssues.companyId, companyId);
  return db.select().from(customerIssues).where(cond).orderBy(desc(customerIssues.frequency), desc(customerIssues.createdAt));
}

export async function addCustomerIssue(companyId: number, data: {
  issueType: "objection" | "faq" | "complaint" | "pre_sale_concern" | "post_sale_issue" | "support_theme" | "feature_request";
  content: string;
  source?: string;
  priority?: "high" | "medium" | "low";
}) {
  const db = await D();
  await db.insert(customerIssues).values({
    companyId,
    issueType: data.issueType,
    content: data.content,
    source: data.source ?? "manual",
    priority: data.priority ?? "medium",
    frequency: 1,
  });
}

export async function extractCustomerIssuesFromText(companyId: number, text: string, source: string) {
  const ctx = await buildCompanyContext(companyId);
  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are a Customer Intelligence analyst. Extract structured customer issues from raw text." },
      { role: "user", content: `Source text:\n"${text}"\n\nSource: ${source}\nCompany Context: ${ctx}\n\nExtract customer issues. Respond as JSON:\n{\n  "issues": [\n    {\n      "issueType": "objection|faq|complaint|pre_sale_concern|post_sale_issue|support_theme|feature_request",\n      "content": "clean, structured description of the issue",\n      "priority": "high|medium|low",\n      "frequency": 1-10\n    }\n  ]\n}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = result.choices[0]?.message?.content;
  const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  const issues = (parsed.issues ?? []) as any[];

  const db = await D();
  for (const issue of issues) {
    // Check for duplicate
    const existing = await db.select().from(customerIssues)
      .where(and(eq(customerIssues.companyId, companyId), eq(customerIssues.issueType, issue.issueType)))
      .limit(50);
    const duplicate = existing.find(e => e.content.toLowerCase().slice(0, 50) === issue.content.toLowerCase().slice(0, 50));
    if (duplicate) {
      await db.update(customerIssues).set({ frequency: (duplicate.frequency ?? 1) + 1, updatedAt: new Date() })
        .where(eq(customerIssues.id, duplicate.id));
    } else {
      await db.insert(customerIssues).values({
        companyId,
        issueType: issue.issueType,
        content: issue.content,
        source,
        priority: issue.priority ?? "medium",
        frequency: issue.frequency ?? 1,
      });
    }
  }

  return issues.length;
}

export async function generateFaqSuggestions(companyId: number): Promise<Array<{
  question: string;
  suggestedAnswer: string;
  basedOnIssues: string[];
  priority: string;
}>> {
  const db = await D();
  const issues = await db.select().from(customerIssues)
    .where(and(eq(customerIssues.companyId, companyId)))
    .orderBy(desc(customerIssues.frequency))
    .limit(20);

  if (!issues.length) return [];

  const ctx = await buildCompanyContext(companyId);
  const issuesSummary = issues.map(i => `[${i.issueType}] ${i.content} (freq: ${i.frequency})`).join("\n");

  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are a Customer Success writer. Generate FAQ entries from customer issues." },
      { role: "user", content: `Company Context: ${ctx}\n\nTop Customer Issues:\n${issuesSummary}\n\nGenerate 5-8 FAQ entries. Respond as JSON:\n{\n  "faqs": [\n    {\n      "question": "Natural question customers ask",\n      "suggestedAnswer": "Clear, helpful answer",\n      "basedOnIssues": ["issue summary 1"],\n      "priority": "high|medium|low"\n    }\n  ]\n}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = result.choices[0]?.message?.content;
  const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

  // Save FAQ suggestions back to customerIssues
  for (const faq of (parsed.faqs ?? [])) {
    await db.insert(customerIssues).values({
      companyId,
      issueType: "faq",
      content: faq.question,
      suggestedResponse: faq.suggestedAnswer,
      suggestedFaq: faq.suggestedAnswer,
      source: "ai_generated",
      priority: faq.priority ?? "medium",
    });
  }

  return parsed.faqs ?? [];
}

export async function buildObjectionMap(companyId: number): Promise<{
  objections: Array<{ objection: string; frequency: number; counterArgument: string; stage: string }>;
  topObjection: string;
  overallConversionRisk: string;
}> {
  const db = await D();
  const objections = await db.select().from(customerIssues)
    .where(and(eq(customerIssues.companyId, companyId), eq(customerIssues.issueType, "objection")))
    .orderBy(desc(customerIssues.frequency))
    .limit(10);

  if (!objections.length) {
    // Generate typical objections for industry
    const companyRows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    const company = companyRows[0];

    const ctx = await buildCompanyContext(companyId);
    const result = await invokeLLM({
      messages: [
        { role: "system", content: "You are a Sales Enablement expert. Generate typical customer objections for this company." },
        { role: "user", content: `Company: ${company?.name}\nIndustry: ${company?.industry ?? "general"}\nContext: ${ctx}\n\nGenerate 5 typical objections. Respond as JSON:\n{\n  "objections": [{ "objection": "...", "frequency": 1-10, "counterArgument": "...", "stage": "awareness|consideration|decision" }],\n  "topObjection": "string",\n  "overallConversionRisk": "low|medium|high"\n}` },
      ],
      response_format: { type: "json_object" },
    });

    const raw = result.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    // Store generated objections
    for (const obj of (parsed.objections ?? [])) {
      await db.insert(customerIssues).values({
        companyId,
        issueType: "objection",
        content: obj.objection,
        suggestedResponse: obj.counterArgument,
        source: "ai_generated",
        priority: obj.frequency >= 7 ? "high" : obj.frequency >= 4 ? "medium" : "low",
        frequency: obj.frequency ?? 1,
      });
    }

    return parsed;
  }

  const ctx = await buildCompanyContext(companyId);
  const objSummary = objections.map(o => `"${o.content}" (freq: ${o.frequency})`).join("\n");

  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are a Sales Coach. Analyze objections and provide counter-arguments." },
      { role: "user", content: `Context: ${ctx}\n\nObjections:\n${objSummary}\n\nBuild objection map. Respond as JSON:\n{\n  "objections": [{ "objection": "string", "frequency": number, "counterArgument": "string", "stage": "awareness|consideration|decision" }],\n  "topObjection": "string",\n  "overallConversionRisk": "low|medium|high"\n}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = result.choices[0]?.message?.content;
  const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

  // Update counter arguments
  for (let i = 0; i < objections.length && i < (parsed.objections ?? []).length; i++) {
    await db.update(customerIssues).set({
      suggestedResponse: parsed.objections[i].counterArgument,
      updatedAt: new Date(),
    }).where(eq(customerIssues.id, objections[i].id));
  }

  return parsed;
}

export async function updateIssueStatus(companyId: number, issueId: number, status: "open" | "addressed" | "resolved" | "in_faq") {
  const db = await D();
  await db.update(customerIssues).set({ status, updatedAt: new Date() })
    .where(and(eq(customerIssues.id, issueId), eq(customerIssues.companyId, companyId)));
}
