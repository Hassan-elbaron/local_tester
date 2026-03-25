/**
 * Brand Guardian — Mention Monitoring + Sentiment Analysis
 * Simulates social listening with AI, manages brand mentions
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { brandMentions, companies } from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { buildCompanyContext } from "./knowledge";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function getBrandMentions(companyId: number) {
  const db = await D();
  return db.select().from(brandMentions)
    .where(eq(brandMentions.companyId, companyId))
    .orderBy(desc(brandMentions.mentionedAt))
    .limit(100);
}

export async function getUrgentMentions(companyId: number) {
  const db = await D();
  return db.select().from(brandMentions)
    .where(and(eq(brandMentions.companyId, companyId), eq(brandMentions.isUrgent, true)))
    .orderBy(desc(brandMentions.mentionedAt));
}

export async function addBrandMention(companyId: number, data: {
  source: "twitter" | "facebook" | "instagram" | "linkedin" | "google_reviews" | "trustpilot" | "news" | "forum" | "other";
  content: string;
  sourceUrl?: string;
  authorName?: string;
}) {
  const db = await D();

  // Auto-analyze sentiment with AI
  const sentimentResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a brand sentiment analyst. Classify this brand mention." },
      { role: "user", content: `Brand mention text: "${data.content}"\n\nClassify this. Respond as JSON:\n{\n  "sentiment": "positive|neutral|negative",\n  "sentimentScore": -1.0 to 1.0,\n  "category": "complaint|praise|question|mention|review|news",\n  "isUrgent": true/false,\n  "urgencyReason": "string or null"\n}` },
    ],
    response_format: { type: "json_object" },
  });

  const sentRaw = sentimentResult.choices[0]?.message?.content;
  const sent = JSON.parse(typeof sentRaw === "string" ? sentRaw : JSON.stringify(sentRaw));

  const insertResult = await db.insert(brandMentions).values({
    companyId,
    source: data.source,
    content: data.content,
    sourceUrl: data.sourceUrl ?? null,
    authorName: data.authorName ?? null,
    sentiment: sent.sentiment ?? "neutral",
    sentimentScore: sent.sentimentScore ? String(sent.sentimentScore) as any : null,
    category: sent.category ?? "mention",
    isUrgent: sent.isUrgent ?? false,
  });

  const id = (insertResult as any)[0]?.insertId ?? (insertResult as any).insertId;
  return { id, sentiment: sent.sentiment, category: sent.category, isUrgent: sent.isUrgent };
}

export async function scanBrandMentions(companyId: number): Promise<{
  mentionsGenerated: number;
  sentimentBreakdown: Record<string, number>;
  urgentCount: number;
}> {
  const db = await D();
  const companyRows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const company = companyRows[0];
  if (!company) throw new Error("Company not found");

  const ctx = await buildCompanyContext(companyId);

  // AI simulates discovering mentions from various sources
  const scanResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a brand monitoring AI. Simulate realistic brand mentions for this company based on their profile. Generate plausible mentions from social media, reviews, and news." },
      { role: "user", content: `Company: ${company.name}\nIndustry: ${company.industry ?? "general"}\nContext: ${ctx}\n\nGenerate 5-8 simulated brand mentions that a real company in this industry would have. Mix of positive, neutral, and negative. Respond as JSON:\n{\n  "mentions": [\n    {\n      "source": "twitter|facebook|instagram|linkedin|google_reviews|trustpilot|news|forum|other",\n      "content": "the mention text",\n      "authorName": "string",\n      "sentiment": "positive|neutral|negative",\n      "sentimentScore": -1.0 to 1.0,\n      "category": "complaint|praise|question|mention|review|news",\n      "isUrgent": false\n    }\n  ]\n}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = scanResult.choices[0]?.message?.content;
  const scan = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  const mentions = (scan.mentions ?? []) as any[];

  let urgentCount = 0;
  const breakdown: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };

  for (const m of mentions) {
    await db.insert(brandMentions).values({
      companyId,
      source: m.source ?? "other",
      content: m.content,
      authorName: m.authorName ?? null,
      sentiment: m.sentiment ?? "neutral",
      sentimentScore: m.sentimentScore ? String(m.sentimentScore) as any : null,
      category: m.category ?? "mention",
      isUrgent: m.isUrgent ?? (m.sentiment === "negative" && m.category === "complaint"),
    });
    breakdown[m.sentiment ?? "neutral"] = (breakdown[m.sentiment ?? "neutral"] ?? 0) + 1;
    if (m.isUrgent) urgentCount++;
  }

  return { mentionsGenerated: mentions.length, sentimentBreakdown: breakdown, urgentCount };
}

export async function analyzeBrandHealth(companyId: number): Promise<{
  healthScore: number;
  sentimentBreakdown: Record<string, number>;
  topIssues: string[];
  topPraises: string[];
  recommendations: string[];
}> {
  const db = await D();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const mentions = await db.select().from(brandMentions)
    .where(and(eq(brandMentions.companyId, companyId), gte(brandMentions.mentionedAt, since)));

  if (!mentions.length) {
    return { healthScore: 75, sentimentBreakdown: {}, topIssues: [], topPraises: [], recommendations: ["Start monitoring brand mentions", "Encourage customer reviews"] };
  }

  const breakdown = { positive: 0, neutral: 0, negative: 0 };
  for (const m of mentions) {
    breakdown[m.sentiment as keyof typeof breakdown] = (breakdown[m.sentiment as keyof typeof breakdown] ?? 0) + 1;
  }

  const total = mentions.length;
  const healthScore = Math.round(((breakdown.positive + breakdown.neutral * 0.5) / total) * 100);

  const negMentions = mentions.filter(m => m.sentiment === "negative").map(m => m.content).slice(0, 5);
  const posMentions = mentions.filter(m => m.sentiment === "positive").map(m => m.content).slice(0, 5);

  const analysisResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a Brand Health Analyst. Summarize brand perception from mentions." },
      { role: "user", content: `Total mentions: ${total}\nBreakdown: ${JSON.stringify(breakdown)}\n\nNegative samples:\n${negMentions.join("\n")}\n\nPositive samples:\n${posMentions.join("\n")}\n\nRespond as JSON:\n{\n  "topIssues": ["issue1", "issue2", "issue3"],\n  "topPraises": ["praise1", "praise2", "praise3"],\n  "recommendations": ["action1", "action2", "action3"]\n}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = analysisResult.choices[0]?.message?.content;
  const analysis = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

  return {
    healthScore,
    sentimentBreakdown: breakdown,
    topIssues: analysis.topIssues ?? [],
    topPraises: analysis.topPraises ?? [],
    recommendations: analysis.recommendations ?? [],
  };
}

export async function reviewMention(companyId: number, mentionId: number, notes?: string) {
  const db = await D();
  await db.update(brandMentions).set({
    isReviewed: true,
    isUrgent: false,
    reviewNotes: notes ?? null,
  }).where(and(eq(brandMentions.id, mentionId), eq(brandMentions.companyId, companyId)));
}

export async function generateMentionResponse(companyId: number, mentionId: number): Promise<string> {
  const db = await D();
  const rows = await db.select().from(brandMentions)
    .where(and(eq(brandMentions.id, mentionId), eq(brandMentions.companyId, companyId)))
    .limit(1);
  if (!rows[0]) throw new Error("Mention not found");
  const mention = rows[0];

  const ctx = await buildCompanyContext(companyId);
  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are a Brand Community Manager. Write a professional, empathetic response to a brand mention." },
      { role: "user", content: `Brand mention:\n"${mention.content}"\n\nSentiment: ${mention.sentiment}\nCategory: ${mention.category}\nSource: ${mention.source}\n\nCompany Context: ${ctx}\n\nWrite a brief, professional response (2-4 sentences). Do not use JSON, just the response text.` },
    ],
  });

  return result.choices[0]?.message?.content ?? "";
}
