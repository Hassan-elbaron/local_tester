/**
 * Replay Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Reads BrainRunResult snapshots back from the decision ledger.
 *
 * Use cases:
 *   - UI "Decision History" — list all runs for a company
 *   - Debug view — inspect full task + deliberation + decision + execution
 *   - Re-run analysis — fetch a past run and diff against a new one
 *   - Audit — retrieve the exact state at the time of a human approval
 */

import { getDb } from "./db";
import { executionLogs } from "../drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { BrainRunResult } from "./orchestration_contract";

// ─── Typed ledger row ─────────────────────────────────────────────────────────
export interface LedgerRow {
  id: number;
  companyId: number;
  proposalId: number | null;
  taskId: string;
  actionType: string;
  status: string;
  executor: string;
  summary: string;
  externalRef: string | null;
  run: BrainRunResult | null;
  executedAt: Date | null;
  createdAt: Date;
}

function toRun(payload: unknown): BrainRunResult | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (!p["task"]) return null;
  return payload as BrainRunResult;
}

function rowToLedger(row: typeof executionLogs.$inferSelect): LedgerRow {
  return {
    id:          row.id,
    companyId:   row.companyId,
    proposalId:  row.proposalId ?? null,
    taskId:      row.taskId,
    actionType:  row.actionType,
    status:      row.status,
    executor:    row.executor,
    summary:     row.summary,
    externalRef: row.externalRef ?? null,
    run:         toRun(row.payload),
    executedAt:  row.executedAt ?? null,
    createdAt:   row.createdAt,
  };
}

/**
 * Retrieve the most recent brain_run ledger entry for a given taskId.
 * Returns null if no run has been recorded yet.
 */
export async function getLatestBrainRun(
  companyId: number,
  taskId: string,
): Promise<LedgerRow | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(executionLogs)
    .where(
      and(
        eq(executionLogs.companyId, companyId),
        eq(executionLogs.taskId,    taskId),
        eq(executionLogs.actionType, "brain_run"),
      ),
    )
    .orderBy(desc(executionLogs.createdAt))
    .limit(1);

  return rows[0] ? rowToLedger(rows[0]) : null;
}

/**
 * Retrieve all brain_run ledger entries for a company, newest first.
 * Optionally filter by proposalId.
 */
export async function getBrainRunHistory(params: {
  companyId: number;
  proposalId?: number;
  limit?: number;
}): Promise<LedgerRow[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(executionLogs.companyId,   params.companyId),
    eq(executionLogs.actionType, "brain_run"),
    ...(params.proposalId != null
      ? [eq(executionLogs.proposalId, params.proposalId)]
      : []),
  ];

  const rows = await db
    .select()
    .from(executionLogs)
    .where(and(...conditions))
    .orderBy(desc(executionLogs.createdAt))
    .limit(params.limit ?? 50);

  return rows.map(rowToLedger);
}
