/**
 * Memory Architecture
 * 6 typed memory stores per company — all isolated, all persistent, all injected into reasoning:
 * 1. Company Memory     — brand, audience, guidelines, identity
 * 2. Decision Memory    — past proposals, approvals, rejections, rationale
 * 3. Learning Memory    — extracted patterns, rules, heuristics
 * 4. Research Memory    — external research results, sources, timestamps
 * 5. Code Review Memory — engineering decisions, security findings, compatibility notes
 * 6. Agent Interaction  — agent opinions history, consensus patterns, dissent records
 */

import { getDb } from "./db";
import { companyMemory } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export type MemoryType = "company" | "decision" | "learning" | "research" | "code_review" | "agent_interaction";

export interface MemoryEntry {
  id?: number;
  companyId: number;
  type: MemoryType;
  key: string;
  value: unknown;
  source?: string;
  confidence?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function memoryTypeToCategory(type: MemoryType): "brand" | "strategy" | "audience" | "competitors" | "performance" | "preferences" | "decisions" | "campaigns" | "results" | "assets" | "guidelines" {
  const map: Record<MemoryType, "brand" | "strategy" | "audience" | "competitors" | "performance" | "preferences" | "decisions" | "campaigns" | "results" | "assets" | "guidelines"> = {
    company: "brand",
    decision: "decisions",
    learning: "strategy",
    research: "competitors",
    code_review: "assets",
    agent_interaction: "performance",
  };
  return map[type];
}

// ─── Write ────────────────────────────────────────────────────────────────────
export async function writeMemory(entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Upsert by companyId + type + key
  const existing = await db.select().from(companyMemory)
    .where(and(
      eq(companyMemory.companyId, entry.companyId),
      eq(companyMemory.key, `${entry.type}::${entry.key}`)
    )).limit(1);
  if (existing.length > 0) {
    await db.update(companyMemory)
      .set({ value: entry.value as any, updatedAt: new Date() })
      .where(eq(companyMemory.id, existing[0].id));
  } else {
    await db.insert(companyMemory).values({
      companyId: entry.companyId,
      category: memoryTypeToCategory(entry.type),
      key: `${entry.type}::${entry.key}`,
      value: entry.value as any,
      source: (entry.source as any) ?? "agent",
      importance: Math.round((entry.confidence ?? 0.5) * 5),
    });
  }
}

// ─── Read by type ─────────────────────────────────────────────────────────────
export async function readMemory(companyId: number, type: MemoryType, limit = 20): Promise<MemoryEntry[]> {
  const db = await getDb();
  if (!db) return [];
  const prefix = `${type}::`;
  const rows = await db.select().from(companyMemory)
    .where(eq(companyMemory.companyId, companyId))
    .orderBy(desc(companyMemory.updatedAt))
    .limit(100);
  return rows
    .filter(r => r.key.startsWith(prefix))
    .slice(0, limit)
    .map(r => ({
      id: r.id,
      companyId: r.companyId,
      type,
      key: r.key.replace(prefix, ""),
      value: r.value,
      source: r.source ?? undefined,
      confidence: r.importance ? r.importance / 5 : undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
}

// ─── Build full context string for injection into LLM ────────────────────────
export async function buildFullMemoryContext(companyId: number): Promise<string> {
  const [company, decision, learning, research, agentInteraction] = await Promise.all([
    readMemory(companyId, "company", 10),
    readMemory(companyId, "decision", 10),
    readMemory(companyId, "learning", 10),
    readMemory(companyId, "research", 5),
    readMemory(companyId, "agent_interaction", 5),
  ]);

  const fmt = (entries: MemoryEntry[]) =>
    entries.map(e => `  • ${e.key}: ${typeof e.value === "string" ? e.value : JSON.stringify(e.value)}`).join("\n") || "  (none yet)";

  return [
    "=== COMPANY MEMORY ===",
    fmt(company),
    "\n=== DECISION HISTORY ===",
    fmt(decision),
    "\n=== LEARNED RULES & PATTERNS ===",
    fmt(learning),
    "\n=== RESEARCH FINDINGS ===",
    fmt(research),
    "\n=== AGENT INTERACTION HISTORY ===",
    fmt(agentInteraction),
  ].join("\n");
}

// ─── Record a decision into Decision Memory ───────────────────────────────────
export async function recordDecisionMemory(params: {
  companyId: number;
  proposalTitle: string;
  proposalType: string;
  decision: "approved" | "rejected" | "revised";
  reason: string;
  consensusScore: number;
  budget?: number;
}): Promise<void> {
  await writeMemory({
    companyId: params.companyId,
    type: "decision",
    key: `${params.proposalType}_${Date.now()}`,
    value: {
      title: params.proposalTitle,
      type: params.proposalType,
      decision: params.decision,
      reason: params.reason,
      consensusScore: params.consensusScore,
      budget: params.budget,
      timestamp: new Date().toISOString(),
    },
    source: "approval_system",
    confidence: params.consensusScore,
  });
}

// ─── Record agent interaction into Agent Interaction Memory ───────────────────
export async function recordAgentInteraction(params: {
  companyId: number;
  proposalType: string;
  agentsUsed: string[];
  weightedConsensus: number;
  dissentCount: number;
  escalated: boolean;
}): Promise<void> {
  await writeMemory({
    companyId: params.companyId,
    type: "agent_interaction",
    key: `deliberation_${params.proposalType}_${Date.now()}`,
    value: params,
    source: "orchestrator",
    confidence: params.weightedConsensus,
  });
}

// ─── Hybrid Memory Façade ─────────────────────────────────────────────────────
// Re-export hybrid memory functions so all memory access flows through this
// module — prevents scattered memory system imports across the codebase.
export {
  writeHybridMemory,
  writeHybridMemories,
  retrieveHybridMemory,
  buildHybridMemoryContext,
} from "./hybrid_memory";
