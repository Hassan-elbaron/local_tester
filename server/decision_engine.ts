/**
 * Decision Engine — Structured Decision Objects
 * Generates, tracks, and manages AI-powered decisions with human approval
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { decisions, companies } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { buildCompanyContext } from "./knowledge";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function getDecisions(companyId: number, status?: string) {
  const db = await D();
  const cond = status
    ? and(eq(decisions.companyId, companyId), eq(decisions.status, status as any))
    : eq(decisions.companyId, companyId);
  return db.select().from(decisions).where(cond).orderBy(desc(decisions.createdAt));
}

export async function getPendingDecisions(companyId: number) {
  const db = await D();
  return db.select().from(decisions)
    .where(and(eq(decisions.companyId, companyId), eq(decisions.status, "pending")))
    .orderBy(desc(decisions.createdAt));
}

export async function approveDecisionItem(companyId: number, decisionId: number, notes?: string) {
  const db = await D();
  await db.update(decisions).set({
    status: "approved",
    humanNotes: notes ?? null,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(decisions.id, decisionId), eq(decisions.companyId, companyId)));
}

export async function rejectDecisionItem(companyId: number, decisionId: number, notes?: string) {
  const db = await D();
  await db.update(decisions).set({
    status: "rejected",
    humanNotes: notes ?? null,
    rejectedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(decisions.id, decisionId), eq(decisions.companyId, companyId)));
}

export async function deferDecision(companyId: number, decisionId: number, notes?: string) {
  const db = await D();
  await db.update(decisions).set({
    status: "deferred",
    humanNotes: notes ?? null,
    updatedAt: new Date(),
  }).where(and(eq(decisions.id, decisionId), eq(decisions.companyId, companyId)));
}

export async function generateDecision(
  companyId: number,
  situation: string,
  decisionType: "strategy" | "campaign" | "content" | "budget" | "channel" | "creative" | "audience" | "seo" | "optimization",
  deliberationId?: number
): Promise<number> {
  const ctx = await buildCompanyContext(companyId);

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are the Decision Engine — a senior marketing strategist that formulates clear, actionable decisions with confidence levels and alternatives.",
      },
      {
        role: "user",
        content: `Company Context:\n${ctx}\n\nSituation requiring decision:\n"${situation}"\n\nDecision Type: ${decisionType}\n\nFormulate a structured decision. Respond as JSON:\n{\n  "recommendation": "clear, actionable recommendation",\n  "reason": "evidence-based reasoning",\n  "confidence": 0.0-1.0,\n  "urgency": "immediate|high|medium|low",\n  "expectedImpact": [\n    { "metric": "ROAS", "change": "+15%", "timeframe": "30 days" }\n  ],\n  "alternatives": [\n    { "option": "Alternative approach", "tradeoff": "pros and cons" }\n  ],\n  "sourceAgents": ["strategy", "analytics"],\n  "supportingMetrics": {}\n}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = result.choices[0]?.message?.content;
  const decision = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

  const db = await D();
  const insertResult = await db.insert(decisions).values({
    companyId,
    decisionType,
    recommendation: decision.recommendation,
    reason: decision.reason,
    confidence: String(decision.confidence ?? 0.75) as any,
    urgency: decision.urgency ?? "medium",
    expectedImpact: decision.expectedImpact ?? [],
    alternatives: decision.alternatives ?? [],
    sourceAgents: decision.sourceAgents ?? [],
    supportingMetrics: decision.supportingMetrics ?? {},
    deliberationId: deliberationId ?? null,
    status: "pending",
  });

  return (insertResult as any)[0]?.insertId ?? (insertResult as any).insertId;
}

export async function generateDecisionFromPredictions(companyId: number): Promise<number> {
  const db = await D();
  const { predictions } = await import("../drizzle/schema");
  const activePreds = await db.select().from(predictions)
    .where(and(eq(predictions.companyId, companyId), eq(predictions.status, "active")))
    .orderBy(desc(predictions.createdAt))
    .limit(5);

  if (!activePreds.length) {
    return generateDecision(
      companyId,
      "General marketing optimization based on company profile",
      "optimization"
    );
  }

  const topPred = activePreds[0];
  const situation = `${topPred.title}: ${topPred.description}. Suggested action: ${topPred.suggestedAction}`;

  return generateDecision(companyId, situation, "optimization");
}

export async function updateDecisionNotes(companyId: number, decisionId: number, notes: string) {
  const db = await D();
  await db.update(decisions).set({
    humanNotes: notes,
    status: "edited",
    updatedAt: new Date(),
  }).where(and(eq(decisions.id, decisionId), eq(decisions.companyId, companyId)));
}
