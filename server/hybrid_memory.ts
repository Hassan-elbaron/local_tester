/**
 * Hybrid Memory
 * ──────────────────────────────────────────────────────────────────────────────
 * Retrieval layer on top of the `brain_memory` table.
 *
 * Today it uses a lexical scoring function (token overlap + confidence +
 * scope weight + recency boost) to rank memories against a free-text query.
 * The interface is intentionally abstracted so embeddings / vector search
 * can be plugged in later without changing any caller.
 *
 * Main exports:
 *  writeHybridMemory()          — persist one MemoryWriteRequest
 *  writeHybridMemories()        — persist a batch
 *  retrieveHybridMemory()       — ranked retrieval by query
 *  buildHybridMemoryContext()   — assemble full context bundle for orchestrator
 *  extractLearningFromRun()     — derive learnings from a completed BrainRun
 */

import { getDb } from "./db";
import { brainMemory } from "../drizzle/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  BrainDecision,
  BrainTask,
  ExecutionReceipt,
  MemoryWriteRequest,
} from "./orchestration_contract";

// ─── Types ────────────────────────────────────────────────────────────────────
export type MemoryScope =
  | "company"
  | "decision"
  | "learning"
  | "research"
  | "execution"
  | "agent_interaction";

export interface MemoryRecord {
  id?: number;
  companyId: number;
  scope: MemoryScope;
  key: string;
  value: unknown;
  confidence?: number;
  source: string;
  createdAt?: Date | string;
}

export interface RetrievedMemory {
  scope: MemoryScope;
  key: string;
  value: unknown;
  score: number;
  reason: string;
  source: string;
  createdAt?: Date | string;
}

export interface MemoryContextBundle {
  topMemories: RetrievedMemory[];
  decisionMemories: RetrievedMemory[];
  executionMemories: RetrievedMemory[];
  learningMemories: RetrievedMemory[];
  assembledContext: string;
}

// ─── Scoring Helpers ──────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(token => token.length >= 3);
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function overlapScore(query: string, candidate: string): number {
  const qTokens = tokenize(query);
  const cSet = new Set(tokenize(candidate));
  if (qTokens.length === 0 || cSet.size === 0) return 0;
  let hits = 0;
  for (const token of qTokens) {
    if (cSet.has(token)) hits++;
  }
  return hits / qTokens.length;
}

function recencyBoost(createdAt?: Date | string): number {
  if (!createdAt) return 0;
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return 0;
  const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return 0.2;
  if (ageDays <= 30) return 0.12;
  if (ageDays <= 90) return 0.06;
  return 0;
}

function scopeWeight(scope: MemoryScope): number {
  switch (scope) {
    case "execution":        return 0.22;
    case "learning":         return 0.20;
    case "decision":         return 0.18;
    case "research":         return 0.14;
    case "agent_interaction":return 0.08;
    case "company":
    default:                 return 0.10;
  }
}

function scoreMemory(query: string, record: MemoryRecord): RetrievedMemory {
  const haystack = `${record.key} ${stringifyValue(record.value)}`;
  const lexical   = overlapScore(query, haystack);
  const conf      = Math.max(0, Math.min(1, record.confidence ?? 0.5));
  const recency   = recencyBoost(record.createdAt);
  const score =
    lexical * 0.55 +
    conf    * 0.20 +
    scopeWeight(record.scope) +
    recency;

  return {
    scope:     record.scope,
    key:       record.key,
    value:     record.value,
    score,
    reason:    `lexical=${lexical.toFixed(2)}, conf=${conf.toFixed(2)}, scope=${record.scope}, recency=${recency.toFixed(2)}`,
    source:    record.source,
    createdAt: record.createdAt,
  };
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function writeHybridMemory(entry: MemoryWriteRequest): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(brainMemory).values({
    companyId:  entry.companyId,
    scope:      entry.scope,
    key:        entry.key,
    value:      entry.value as Record<string, unknown>,
    confidence: Math.max(0, Math.min(1, entry.confidence ?? 0.5)),
    source:     entry.source,
    createdAt:  new Date(),
  });
}

export async function writeHybridMemories(entries: MemoryWriteRequest[]): Promise<void> {
  for (const entry of entries) {
    await writeHybridMemory(entry);
  }
}

// ─── Retrieve ─────────────────────────────────────────────────────────────────

export async function retrieveHybridMemory(params: {
  companyId: number;
  query: string;
  scopes?: MemoryScope[];
  limit?: number;
}): Promise<RetrievedMemory[]> {
  const db = await getDb();
  if (!db) return [];

  const scopes = params.scopes ?? [
    "decision", "learning", "execution", "research", "agent_interaction", "company",
  ];

  const rows = await db
    .select()
    .from(brainMemory)
    .where(
      and(
        eq(brainMemory.companyId, params.companyId),
        inArray(brainMemory.scope, scopes),
      ),
    )
    .orderBy(desc(brainMemory.createdAt))
    .limit(200);

  return rows
    .map(row =>
      scoreMemory(params.query, {
        companyId:  row.companyId,
        scope:      row.scope as MemoryScope,
        key:        row.key,
        value:      row.value,
        confidence: row.confidence ?? 0.5,
        source:     row.source,
        createdAt:  row.createdAt ?? undefined,
      }),
    )
    .filter(item => item.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, params.limit ?? 12);
}

// ─── Context Bundle ───────────────────────────────────────────────────────────

export async function buildHybridMemoryContext(params: {
  companyId: number;
  task: BrainTask;
}): Promise<MemoryContextBundle> {
  const query = [
    params.task.title,
    params.task.description,
    params.task.type,
    params.task.action,
    JSON.stringify(params.task.input ?? {}),
  ].join(" ");

  const [topMemories, decisionMemories, executionMemories, learningMemories] =
    await Promise.all([
      retrieveHybridMemory({ companyId: params.companyId, query, limit: 10 }),
      retrieveHybridMemory({ companyId: params.companyId, query, scopes: ["decision"],  limit: 5 }),
      retrieveHybridMemory({ companyId: params.companyId, query, scopes: ["execution"], limit: 5 }),
      retrieveHybridMemory({ companyId: params.companyId, query, scopes: ["learning"],  limit: 5 }),
    ]);

  const assembledContext = [
    "=== TOP MEMORY ===",
    ...topMemories.map(m => `- [${m.scope}] ${m.key}: ${stringifyValue(m.value).slice(0, 500)}`),
    "=== DECISION MEMORY ===",
    ...decisionMemories.map(m => `- ${m.key}: ${stringifyValue(m.value).slice(0, 400)}`),
    "=== EXECUTION MEMORY ===",
    ...executionMemories.map(m => `- ${m.key}: ${stringifyValue(m.value).slice(0, 400)}`),
    "=== LEARNING MEMORY ===",
    ...learningMemories.map(m => `- ${m.key}: ${stringifyValue(m.value).slice(0, 400)}`),
  ].join("\n");

  return { topMemories, decisionMemories, executionMemories, learningMemories, assembledContext };
}

// ─── Learning Extractor ───────────────────────────────────────────────────────

export function extractLearningFromRun(params: {
  task: BrainTask;
  decision?: BrainDecision;
  execution?: ExecutionReceipt;
}): MemoryWriteRequest[] {
  const writes: MemoryWriteRequest[] = [];

  if (params.decision) {
    writes.push({
      companyId:  params.task.companyId,
      scope:      "learning",
      key:        `learning_task_${params.task.id}_decision`,
      value: {
        taskType:       params.task.type,
        action:         params.task.action,
        recommendation: params.decision.recommendation,
        confidence:     params.decision.confidence,
        riskScore:      params.decision.riskScore,
        status:         params.decision.status,
      },
      confidence: params.decision.confidence,
      source:     "learning_extractor",
    });
  }

  if (params.execution) {
    writes.push({
      companyId:  params.task.companyId,
      scope:      "learning",
      key:        `learning_task_${params.task.id}_execution`,
      value: {
        taskType:        params.task.type,
        executor:        params.execution.executor,
        executionStatus: params.execution.status,
        externalRef:     params.execution.externalRef ?? null,
        summary:         params.execution.summary,
      },
      confidence: params.execution.status === "completed" ? 1 : 0.5,
      source:     "learning_extractor",
    });
  }

  return writes;
}
