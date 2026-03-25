/**
 * Strategy Versioning System
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles: snapshot before edit, version diff, rollback, section re-deliberation
 * All edits go through here to guarantee audit trail.
 */
import { getDb } from "./db";
import { strategyVersions, masterStrategy } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { getStrategy, saveStrategy } from "./pipeline";
import { invokeLLM } from "./_core/llm";
import { buildCompanyContext } from "./knowledge";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ─── Editable Strategy Sections ───────────────────────────────────────────────

export const STRATEGY_SECTIONS = [
  { key: "positioning",           label: "Brand Positioning",       type: "text"   },
  { key: "brandMessage",          label: "Brand Message",           type: "text"   },
  { key: "toneOfVoice",           label: "Tone of Voice",           type: "text"   },
  { key: "channelStrategy",       label: "Channel Strategy",        type: "json"   },
  { key: "funnelArchitecture",    label: "Funnel Architecture",     type: "json"   },
  { key: "contentStrategy",       label: "Content Strategy",        type: "json"   },
  { key: "seoStrategy",           label: "SEO Strategy",            type: "json"   },
  { key: "paidMediaStrategy",     label: "Paid Media Strategy",     type: "json"   },
  { key: "automationStrategy",    label: "Automation Strategy",     type: "json"   },
  { key: "kpis",                  label: "KPIs & Goals",            type: "json"   },
  { key: "executionPriorities",   label: "Execution Priorities",    type: "json"   },
] as const;

export type StrategySectionKey = typeof STRATEGY_SECTIONS[number]["key"];

// ─── Snapshot (save current strategy as a version record) ─────────────────────

export async function snapshotStrategy(
  companyId: number,
  strategyId: number,
  changedBy: string,
  changeReason?: string,
  changeLog?: Array<{ field: string; oldValue: unknown; newValue: unknown; changedBy: string }>
) {
  const db = await D();
  const rows = await db.select().from(masterStrategy).where(eq(masterStrategy.id, strategyId)).limit(1);
  const strategy = rows[0];
  if (!strategy) throw new Error("Strategy not found");

  // Count existing versions for this strategy
  const existing = await db.select().from(strategyVersions)
    .where(and(eq(strategyVersions.companyId, companyId), eq(strategyVersions.strategyId, strategyId)))
    .orderBy(desc(strategyVersions.version))
    .limit(1);

  const nextVersion = (existing[0]?.version ?? 0) + 1;

  const { id, createdAt, updatedAt, ...snapshotData } = strategy;

  const result = await db.insert(strategyVersions).values({
    companyId,
    strategyId,
    version: nextVersion,
    snapshotData: snapshotData as any,
    changeLog: changeLog ?? [],
    changedBy,
    changeReason: changeReason ?? null,
  });

  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return insertId as number;
}

// ─── Read Versions ────────────────────────────────────────────────────────────

export async function getStrategyVersions(companyId: number, strategyId: number) {
  const db = await D();
  return db.select({
    id: strategyVersions.id,
    version: strategyVersions.version,
    changedBy: strategyVersions.changedBy,
    changeReason: strategyVersions.changeReason,
    changeLog: strategyVersions.changeLog,
    createdAt: strategyVersions.createdAt,
  }).from(strategyVersions)
    .where(and(eq(strategyVersions.companyId, companyId), eq(strategyVersions.strategyId, strategyId)))
    .orderBy(desc(strategyVersions.version));
}

export async function getStrategyVersionById(versionId: number, companyId: number) {
  const db = await D();
  const rows = await db.select().from(strategyVersions)
    .where(and(eq(strategyVersions.id, versionId), eq(strategyVersions.companyId, companyId)))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Compare Two Versions ─────────────────────────────────────────────────────

export type VersionDiff = {
  field: string;
  label: string;
  versionA: unknown;
  versionB: unknown;
  changed: boolean;
};

export async function compareStrategyVersions(
  companyId: number,
  versionIdA: number,
  versionIdB: number
): Promise<{ diffs: VersionDiff[]; summary: string }> {
  const [a, b] = await Promise.all([
    getStrategyVersionById(versionIdA, companyId),
    getStrategyVersionById(versionIdB, companyId),
  ]);
  if (!a || !b) throw new Error("One or both versions not found");

  const snapshotA = a.snapshotData as Record<string, unknown>;
  const snapshotB = b.snapshotData as Record<string, unknown>;

  const diffs: VersionDiff[] = STRATEGY_SECTIONS.map(({ key, label }) => {
    const valA = snapshotA[key];
    const valB = snapshotB[key];
    const changed = JSON.stringify(valA) !== JSON.stringify(valB);
    return { field: key, label, versionA: valA, versionB: valB, changed };
  });

  const changedFields = diffs.filter(d => d.changed).map(d => d.label);
  const summary = changedFields.length === 0
    ? "No differences found between these versions."
    : `${changedFields.length} section(s) changed: ${changedFields.join(", ")}`;

  return { diffs, summary };
}

// ─── Edit a Strategy Section (with auto-snapshot) ────────────────────────────

export async function editStrategySection(
  companyId: number,
  section: StrategySectionKey,
  newValue: unknown,
  changedBy: string,
  changeReason?: string
): Promise<{ snapshotVersionId: number; success: boolean }> {
  const current = await getStrategy(companyId);
  if (!current) throw new Error("No strategy found for this company");

  const oldValue = (current as any)[section];

  // 1. Snapshot current state before edit
  const changeLog = [{
    field: section,
    oldValue,
    newValue,
    changedBy,
  }];

  const snapshotVersionId = await snapshotStrategy(
    companyId,
    current.id,
    changedBy,
    changeReason ?? `Edited section: ${section}`,
    changeLog
  );

  // 2. Apply the edit to the live strategy
  const patch: Record<string, unknown> = {};
  patch[section] = newValue;

  // Append to revision history
  const history = (current.revisionHistory as any[] ?? []);
  history.push({
    version: current.version,
    note: changeReason ?? `Section '${section}' updated by ${changedBy}`,
    timestamp: new Date().toISOString(),
  });
  patch["revisionHistory"] = history;

  await saveStrategy(companyId, patch as any);

  return { snapshotVersionId, success: true };
}

// ─── Rollback to a Previous Version ──────────────────────────────────────────

export async function rollbackToVersion(
  companyId: number,
  versionId: number,
  rolledBackBy: string
): Promise<{ success: boolean; restoredVersion: number }> {
  const current = await getStrategy(companyId);
  if (!current) throw new Error("No strategy found");

  const targetVersion = await getStrategyVersionById(versionId, companyId);
  if (!targetVersion) throw new Error("Version not found");

  // Snapshot the current state before rollback
  await snapshotStrategy(
    companyId,
    current.id,
    rolledBackBy,
    `Pre-rollback snapshot (reverting to v${targetVersion.version})`,
    []
  );

  // Restore all section fields from snapshot
  const snapshot = targetVersion.snapshotData as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const { key } of STRATEGY_SECTIONS) {
    if (snapshot[key] !== undefined) patch[key] = snapshot[key];
  }

  // Update revision history
  const history = (current.revisionHistory as any[] ?? []);
  history.push({
    version: current.version,
    note: `Rolled back to version ${targetVersion.version} by ${rolledBackBy}`,
    timestamp: new Date().toISOString(),
  });
  patch["revisionHistory"] = history;
  // Rollback resets approval status to in_review
  patch["status"] = "in_review";
  patch["approvedAt"] = null;
  patch["approvedBy"] = null;

  await saveStrategy(companyId, patch as any);

  return { success: true, restoredVersion: targetVersion.version };
}

// ─── Re-Deliberate a Specific Section ─────────────────────────────────────────

export async function deliberateOnSection(
  companyId: number,
  section: StrategySectionKey,
  sectionLabel: string,
  userFeedback?: string
): Promise<{
  recommendation: string;
  reasoning: string;
  proposedValue: unknown;
  agentsInvolved: string[];
  confidenceScore: number;
}> {
  const [current, ctx] = await Promise.all([
    getStrategy(companyId),
    buildCompanyContext(companyId),
  ]);
  if (!current) throw new Error("No strategy found");

  const currentSectionValue = (current as any)[section];
  const feedback = userFeedback ? `\n\nOwner feedback: "${userFeedback}"` : "";

  // Select relevant agents per section type
  const SECTION_AGENTS: Record<string, string[]> = {
    positioning:          ["business_understanding", "brand_messaging", "strategy"],
    brandMessage:         ["brand_messaging", "content_strategy", "strategy"],
    toneOfVoice:          ["brand_messaging", "community_reputation", "strategy"],
    channelStrategy:      ["paid_strategy", "content_strategy", "seo_strategy", "strategy"],
    funnelArchitecture:   ["funnel_architect", "paid_strategy", "ux_ui", "strategy"],
    contentStrategy:      ["content_strategy", "brand_messaging", "seo_strategy"],
    seoStrategy:          ["seo_strategy", "content_strategy", "strategy"],
    paidMediaStrategy:    ["paid_strategy", "budget", "analytics"],
    automationStrategy:   ["automation", "analytics", "strategy"],
    kpis:                 ["analytics", "budget", "strategy"],
    executionPriorities:  ["strategy", "funnel_architect", "budget"],
  };

  const agents = SECTION_AGENTS[section] ?? ["strategy"];

  // Build opinions from each relevant agent
  const agentOpinions: string[] = [];

  for (const agentId of agents) {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the ${agentId.replace(/_/g, " ")} agent in a marketing AI system. Your role is to provide expert opinion on the "${sectionLabel}" section of the marketing strategy.`,
        },
        {
          role: "user",
          content: `Company Context:\n${ctx}\n\nCurrent "${sectionLabel}" value:\n${JSON.stringify(currentSectionValue, null, 2)}${feedback}\n\nProvide your expert recommendation for improving this section. Be specific and actionable. Respond as JSON: { "opinion": "...", "recommendation": "...", "proposedValue": {...or text...}, "confidence": 0.0-1.0 }`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = result.choices[0]?.message?.content;
    const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    agentOpinions.push(`[${agentId}] ${parsed.opinion ?? ""}\nRecommendation: ${parsed.recommendation ?? ""}`);
  }

  // Final synthesis
  const synthesisResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are the Strategy Synthesizer. Aggregate the following agent opinions and produce a final recommendation for the "${sectionLabel}" section.`,
      },
      {
        role: "user",
        content: `Company Context:\n${ctx}\n\nCurrent value:\n${JSON.stringify(currentSectionValue, null, 2)}\n\nAgent Opinions:\n${agentOpinions.join("\n\n")}${feedback}\n\nRespond as JSON: { "recommendation": "string — one-paragraph summary", "reasoning": "string — why this is recommended", "proposedValue": <same structure as current value, with improvements applied>, "confidenceScore": 0.0-1.0 }`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = synthesisResult.choices[0]?.message?.content;
  const synthesis = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

  return {
    recommendation: synthesis.recommendation ?? "",
    reasoning: synthesis.reasoning ?? "",
    proposedValue: synthesis.proposedValue ?? currentSectionValue,
    agentsInvolved: agents,
    confidenceScore: typeof synthesis.confidenceScore === "number" ? synthesis.confidenceScore : 0.75,
  };
}

// ─── Get Latest Version Number ────────────────────────────────────────────────

export async function getLatestVersionNumber(companyId: number, strategyId: number): Promise<number> {
  const db = await D();
  const rows = await db.select({ version: strategyVersions.version })
    .from(strategyVersions)
    .where(and(eq(strategyVersions.companyId, companyId), eq(strategyVersions.strategyId, strategyId)))
    .orderBy(desc(strategyVersions.version))
    .limit(1);
  return rows[0]?.version ?? 0;
}
