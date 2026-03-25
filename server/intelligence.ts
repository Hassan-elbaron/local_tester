/**
 * Intelligence Engine — Learning Loop, Decision Scoring, Pattern Detection
 * All operations are human-governed: rules require approval before activation.
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  learnings, systemRules, campaignResults, ownerPreferences,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ExtractedLearning {
  whatHappened: string;
  whySucceeded: string | null;
  whyFailed: string | null;
  pattern: string | null;
  actionableInsight: string;
  category: "budget" | "audience" | "creative" | "timing" | "channel" | "approval_pattern" | "owner_preference" | "market" | "general";
  confidence: number;
}

export interface DecisionScore {
  score: number;           // 0-10
  confidence: number;      // 0-100 percent
  riskLevel: "low" | "medium" | "high";
  expectedOutcome: string;
  reasoning: string;
  predictedRoas?: number;
  predictedCpa?: number;
  bestCase: string;
  worstCase: string;
}

export interface ScenarioModel {
  scenario: string;
  description: string;
  predictedRoas: number;
  predictedCpa: number;
  confidenceMin: number;
  confidenceMax: number;
  recommendation: string;
}

// ─── Learning Extraction ──────────────────────────────────────────────────────
export async function extractLearningFromEvent(params: {
  companyId: number;
  eventType: "proposal_approved" | "proposal_rejected" | "proposal_revised" | "deliberation_complete" | "campaign_result" | "option_selected";
  entityId: number;
  entityType: string;
  context: string; // JSON-serialized context about the event
}): Promise<number | null> {
  try {
    const prompt = `You are a marketing intelligence analyst. Analyze this event and extract a structured learning.

Event Type: ${params.eventType}
Entity: ${params.entityType} #${params.entityId}
Context: ${params.context}

Extract a learning from this event. Return JSON matching this schema exactly:
{
  "whatHappened": "brief factual description of what happened",
  "whySucceeded": "if successful: specific reasons why it worked (null if not applicable)",
  "whyFailed": "if failed/rejected: specific reasons why it failed (null if not applicable)",
  "pattern": "if a recurring pattern is detected: describe it (null if first occurrence)",
  "actionableInsight": "concrete actionable insight for future decisions (1-2 sentences)",
  "category": "one of: budget|audience|creative|timing|channel|approval_pattern|owner_preference|market|general",
  "confidence": 0.75
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a marketing intelligence analyst. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "learning",
          strict: true,
          schema: {
            type: "object",
            properties: {
              whatHappened: { type: "string" },
              whySucceeded: { type: ["string", "null"] },
              whyFailed: { type: ["string", "null"] },
              pattern: { type: ["string", "null"] },
              actionableInsight: { type: "string" },
              category: { type: "string", enum: ["budget","audience","creative","timing","channel","approval_pattern","owner_preference","market","general"] },
              confidence: { type: "number" },
            },
            required: ["whatHappened", "whySucceeded", "whyFailed", "pattern", "actionableInsight", "category", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "{}");
    if (!content) return null;
    const extracted: ExtractedLearning = JSON.parse(content);;
    const db = await getDb();
    if (!db) return null;
    const [result] = await db.insert(learnings).values({
      companyId: params.companyId,
      eventType: params.eventType,
      entityId: params.entityId,
      entityType: params.entityType,
      whatHappened: extracted.whatHappened,
      whySucceeded: extracted.whySucceeded,
      whyFailed: extracted.whyFailed,
      pattern: extracted.pattern,
      actionableInsight: extracted.actionableInsight,
      category: extracted.category,
      confidence: String(extracted.confidence),
    });

    return (result as any).insertId ?? null;
  } catch (err) {
    console.error("[Intelligence] extractLearningFromEvent failed:", err);
    return null;
  }
}

// ─── Rule Generation (requires human approval before activation) ──────────────
export async function generateRuleFromLearnings(params: {
  companyId: number;
  learningIds: number[];
}): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const items = await db
      .select()
      .from(learnings)
      .where(and(
        eq(learnings.companyId, params.companyId),
        sql`${learnings.id} IN (${params.learningIds.join(",")})`
      ));

    if (!items.length) return null;

    const learningsSummary = items.map(l =>
      `- ${l.whatHappened} | Insight: ${l.actionableInsight} | Category: ${l.category}`
    ).join("\n");

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a marketing strategy expert. Generate actionable rules from patterns. Respond with JSON only." },
        { role: "user", content: `Based on these learnings, generate one actionable rule:\n\n${learningsSummary}\n\nReturn JSON:\n{"ruleText": "...", "ruleTextAr": "...", "appliesTo": "proposals|budget|audience|creative|timing|channel|approval|general", "confidence": 0.80}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "rule",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ruleText: { type: "string" },
              ruleTextAr: { type: "string" },
              appliesTo: { type: "string", enum: ["proposals","budget","audience","creative","timing","channel","approval","general"] },
              confidence: { type: "number" },
            },
            required: ["ruleText", "ruleTextAr", "appliesTo", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "{}");
    if (!content) return null;
    const rule = JSON.parse(content);

    // Rule is created as INACTIVE — requires human approval before activation
    const [result] = await db!.insert(systemRules).values({
      companyId: params.companyId,
      ruleText: rule.ruleText,
      ruleTextAr: rule.ruleTextAr,
      appliesTo: rule.appliesTo,
      sourceLearningIds: params.learningIds,
      confidence: String(rule.confidence),
      approvedByHuman: false,
      isActive: false,
    });

    return (result as any).insertId ?? null;
  } catch (err) {
    console.error("[Intelligence] generateRuleFromLearnings failed:", err);
    return null;
  }
}

// ─── Decision Scoring ─────────────────────────────────────────────────────────
export async function scoreDecisionOption(params: {
  companyId: number;
  proposalTitle: string;
  proposalType: string;
  optionTitle: string;
  optionDescription: string;
  budget: number;
  companyContext: string;
  activeRules: string;
}): Promise<DecisionScore> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a senior marketing strategist. Score this decision option objectively. Respond with JSON only." },
        { role: "user", content: `Score this marketing decision option:

Proposal: "${params.proposalTitle}" (${params.proposalType})
Option: "${params.optionTitle}"
Description: ${params.optionDescription}
Budget: $${params.budget.toLocaleString()}

Company Context:
${params.companyContext}

Active Rules:
${params.activeRules || "No active rules yet."}

Return JSON:
{
  "score": 7.5,
  "confidence": 72,
  "riskLevel": "medium",
  "expectedOutcome": "...",
  "reasoning": "...",
  "predictedRoas": 3.2,
  "predictedCpa": 45.00,
  "bestCase": "...",
  "worstCase": "..."
}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "decision_score",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              confidence: { type: "number" },
              riskLevel: { type: "string", enum: ["low","medium","high"] },
              expectedOutcome: { type: "string" },
              reasoning: { type: "string" },
              predictedRoas: { type: ["number","null"] },
              predictedCpa: { type: ["number","null"] },
              bestCase: { type: "string" },
              worstCase: { type: "string" },
            },
            required: ["score","confidence","riskLevel","expectedOutcome","reasoning","predictedRoas","predictedCpa","bestCase","worstCase"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "{}");
    if (!content) throw new Error("No response");
    return JSON.parse(content);
  } catch {
    return {
      score: 6.0, confidence: 60, riskLevel: "medium",
      expectedOutcome: "Moderate performance expected based on available data.",
      reasoning: "Insufficient data for precise scoring.",
      predictedRoas: undefined, predictedCpa: undefined,
      bestCase: "Campaign exceeds targets by 20%.",
      worstCase: "Campaign underperforms by 30%.",
    };
  }
}

// ─── Scenario Modeling ────────────────────────────────────────────────────────
export async function modelScenarios(params: {
  companyId: number;
  proposalTitle: string;
  baseBudget: number;
  baseRoas: number;
  baseCpa: number;
  companyContext: string;
}): Promise<ScenarioModel[]> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a marketing analyst. Model budget and creative scenarios. Respond with JSON only." },
        { role: "user", content: `Model 4 scenarios for this campaign:

Proposal: "${params.proposalTitle}"
Base Budget: $${params.baseBudget.toLocaleString()}
Base ROAS: ${params.baseRoas}x
Base CPA: $${params.baseCpa}

Company Context:
${params.companyContext}

Return JSON array of 4 scenarios:
[
  {"scenario": "budget_increase_20", "description": "...", "predictedRoas": 3.5, "predictedCpa": 40, "confidenceMin": 65, "confidenceMax": 80, "recommendation": "..."},
  {"scenario": "budget_decrease_20", ...},
  {"scenario": "creative_refresh", ...},
  {"scenario": "audience_expansion", ...}
]` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "scenarios",
          strict: true,
          schema: {
            type: "object",
            properties: {
              scenarios: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    scenario: { type: "string" },
                    description: { type: "string" },
                    predictedRoas: { type: "number" },
                    predictedCpa: { type: "number" },
                    confidenceMin: { type: "number" },
                    confidenceMax: { type: "number" },
                    recommendation: { type: "string" },
                  },
                  required: ["scenario","description","predictedRoas","predictedCpa","confidenceMin","confidenceMax","recommendation"],
                  additionalProperties: false,
                },
              },
            },
            required: ["scenarios"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "[]");
    if (!content) return [];
    const parsed = JSON.parse(content);
    return parsed.scenarios ?? [];
  } catch {
    return [];
  }
}

// ─── Pattern Discovery ────────────────────────────────────────────────────────
export async function discoverPatterns(params: {
  companyId: number;
  recentLearnings: Array<{ category: string; actionableInsight: string; confidence: string | null }>;
}): Promise<Array<{ pattern: string; frequency: number; insight: string; category: string }>> {
  if (!params.recentLearnings.length) return [];

  try {
    const summary = params.recentLearnings
      .map(l => `[${l.category}] ${l.actionableInsight}`)
      .join("\n");

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a data analyst. Find patterns in marketing learnings. Respond with JSON only." },
        { role: "user", content: `Find recurring patterns in these learnings:\n\n${summary}\n\nReturn JSON:\n{"patterns": [{"pattern": "...", "frequency": 3, "insight": "...", "category": "budget|audience|creative|timing|channel|general"}]}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "patterns",
          strict: true,
          schema: {
            type: "object",
            properties: {
              patterns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    pattern: { type: "string" },
                    frequency: { type: "number" },
                    insight: { type: "string" },
                    category: { type: "string" },
                  },
                  required: ["pattern","frequency","insight","category"],
                  additionalProperties: false,
                },
              },
            },
            required: ["patterns"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "[]");
    if (!content) return [];
    const parsed = JSON.parse(content);
    return parsed.patterns ?? [];
  } catch {
    return [];
  }
}

// ─── Owner Preference Learning ────────────────────────────────────────────────
export async function updateOwnerPreferences(params: {
  companyId: number;
  action: "approved" | "rejected" | "revised";
  proposalType: string;
  budget: number;
  channels: string[];
  reason?: string;
}): Promise<void> {
   try {
    const db = await getDb();
    if (!db) return;
    // Track budget preference
    await db.insert(ownerPreferences).values({
      companyId: params.companyId,
      preferenceType: "budget_range",
      key: `${params.action}_budget`,
      value: { amount: params.budget, action: params.action },
      evidence: `${params.action} proposal with $${params.budget} budget`,
      confidence: "0.70",
    }).onDuplicateKeyUpdate({
      set: {
        value: { amount: params.budget, action: params.action },
        evidence: `${params.action} proposal with $${params.budget} budget`,
      },
    });

    // Track proposal type preference
    await db.insert(ownerPreferences).values({
      companyId: params.companyId,
      preferenceType: "proposal_type",
      key: `${params.action}_type_${params.proposalType}`,
      value: { type: params.proposalType, action: params.action, count: 1 },
      evidence: `${params.action} ${params.proposalType} proposal`,
      confidence: "0.65",
    }).onDuplicateKeyUpdate({
      set: {
        evidence: `${params.action} ${params.proposalType} proposal (updated)`,
      },
    });
  } catch (err) {
    console.error("[Intelligence] updateOwnerPreferences failed:", err);
  }
}

// ─── Intelligence Context Builder ─────────────────────────────────────────────
export async function buildIntelligenceContext(companyId: number): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "No intelligence context available yet.";

    const [recentLearnings, activeRules, preferences] = await Promise.all([
      db.select().from(learnings)
        .where(eq(learnings.companyId, companyId))
        .orderBy(desc(learnings.createdAt))
        .limit(10),
      db.select().from(systemRules)
        .where(and(eq(systemRules.companyId, companyId), eq(systemRules.isActive, true)))
        .limit(10),
      db.select().from(ownerPreferences)
        .where(eq(ownerPreferences.companyId, companyId))
        .limit(10),
    ]);

    const parts: string[] = [];

     if (activeRules.length) {
      parts.push("## Active Rules (Human-Approved)");
      (activeRules as any[]).forEach((r: any) => parts.push(`- ${r.ruleText}`));
    }
    if (recentLearnings.length) {
      parts.push("\n## Recent Learnings");
      (recentLearnings as any[]).slice(0, 5).forEach((l: any) =>
        parts.push(`- [${l.category}] ${l.actionableInsight}`)
      );
    }
    if (preferences.length) {
      parts.push("\n## Owner Preferences");
      (preferences as any[]).forEach((p: any) =>
        parts.push(`- ${p.preferenceType}: ${p.key} (confidence: ${p.confidence})`)
      );
    }
    return parts.join("\n") || "No intelligence context available yet.";
  } catch {
    return "No intelligence context available yet.";
  }
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────
export async function getLearnings(companyId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(learnings)
    .where(eq(learnings.companyId, companyId))
    .orderBy(desc(learnings.createdAt))
    .limit(limit);
}

export async function getSystemRules(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemRules)
    .where(eq(systemRules.companyId, companyId))
    .orderBy(desc(systemRules.createdAt));
}

export async function approveRule(ruleId: number, approvedBy: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(systemRules)
    .set({ approvedByHuman: true, isActive: true, approvedAt: new Date(), approvedBy })
    .where(eq(systemRules.id, ruleId));
}

export async function rejectRule(ruleId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(systemRules).where(eq(systemRules.id, ruleId));
}

export async function getCampaignResults(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignResults)
    .where(eq(campaignResults.companyId, companyId))
    .orderBy(desc(campaignResults.createdAt));
}

export async function saveCampaignResult(data: {
  companyId: number;
  proposalId: number;
  actualRoas?: number;
  actualCpa?: number;
  actualReach?: number;
  actualImpressions?: number;
  actualClicks?: number;
  actualConversions?: number;
  actualSpend?: number;
  actualRevenue?: number;
  predictedRoas?: number;
  predictedCpa?: number;
  performanceVsPrediction?: "exceeded" | "met" | "below" | "far_below";
  notes?: string;
  enteredBy: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(campaignResults).values({
    ...data,
    actualRoas: data.actualRoas ? String(data.actualRoas) : undefined,
    actualCpa: data.actualCpa ? String(data.actualCpa) : undefined,
    actualSpend: data.actualSpend ? String(data.actualSpend) : undefined,
    actualRevenue: data.actualRevenue ? String(data.actualRevenue) : undefined,
    predictedRoas: data.predictedRoas ? String(data.predictedRoas) : undefined,
    predictedCpa: data.predictedCpa ? String(data.predictedCpa) : undefined,
  });
  return (result as any).insertId;
}
