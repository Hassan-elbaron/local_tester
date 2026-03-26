/**
 * Decision Ledger
 * ──────────────────────────────────────────────────────────────────────────────
 * Persists a complete BrainRunResult as a single atomic snapshot to
 * execution_logs. Every deliberation run — whether it produced an approved
 * execution, a blocked receipt, or just a recommendation — gets one ledger row.
 *
 * This makes every run:
 *   - Auditable   : full task + deliberation + decision + execution in one row
 *   - Replayable  : the payload has everything needed to reconstruct the run
 *   - Diagnosable : any bad decision can be inspected directly from DB
 *   - UI-ready    : a "Decision History" page can query this table directly
 *
 * Storage: execution_logs (actionType = "brain_run")
 */

import { getDb } from "./db";
import { executionLogs } from "../drizzle/schema";
import { BrainRunResult } from "./orchestration_contract";

// ─── Map BrainDecision/ExecutionReceipt status → executionLogs enum ──────────
// execution_logs.status: "planned" | "running" | "completed" | "failed" | "blocked"
function resolveLogStatus(
  run: BrainRunResult,
): "planned" | "running" | "completed" | "failed" | "blocked" {
  // Execution status is already in the right enum — use it if present
  if (run.execution?.status) {
    return run.execution.status; // already a valid enum value
  }

  // Fall back to decision status with mapping
  switch (run.decision?.status) {
    case "approved":        return "completed";
    case "pending_approval":return "planned";
    case "needs_revision":  return "failed";
    case "rejected":        return "failed";
    default:                return "completed";
  }
}

/**
 * Write a full BrainRunResult snapshot to the decision ledger.
 * Safe to call after every deliberation — never throws so it never
 * interrupts the main orchestration flow.
 */
export async function persistBrainRunLedger(
  run: BrainRunResult,
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(executionLogs).values({
      companyId:   run.task.companyId,
      proposalId:  run.task.proposalId ?? null,
      taskId:      run.task.id,
      actionType:  "brain_run",
      status:      resolveLogStatus(run),
      executor:    "brain_ledger",
      externalRef: run.execution?.externalRef ?? null,
      summary:     run.decision?.recommendation ?? run.task.title,
      payload: {
        task:         run.task,
        deliberation: run.deliberation  ?? null,
        decision:     run.decision      ?? null,
        execution:    run.execution     ?? null,
        memoryWrites: run.memoryWrites  ?? [],
      },
      executedAt: run.execution?.executedAt
        ? new Date(run.execution.executedAt)
        : new Date(),
      createdAt: new Date(),
    });
  } catch (err: unknown) {
    // Ledger write failure is non-fatal — log and continue
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[decision_ledger] Failed to persist brain run ${run.task.id}: ${msg}`);
  }
}
