/**
 * Approval Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Persists human approval / rejection records for BrainDecisions.
 *
 * This is the authoritative record that a human reviewed the AI decision
 * before any external execution was allowed. It is write-only and append-only —
 * existing approvals are never mutated.
 *
 * After calling recordApproval(), the caller is responsible for:
 *   - Updating the in-memory / passed-through BrainDecision to status="approved"
 *     and executionAllowed=true  (if approved)
 *   - Calling runExecutionWithReceipt() via the execution router
 *
 * Storage: execution_logs table (reused — execution_logs acts as the generic
 * control-plane audit ledger for decisions, approvals, and receipts).
 */

import { getDb } from "./db";
import { executionLogs } from "../drizzle/schema";
import { BrainApproval } from "./orchestration_contract";

/**
 * Write an approval or rejection record to the audit ledger.
 * Never throws — on DB failure returns an error object so the caller can
 * surface the problem without crashing the request.
 */
export async function recordApproval(
  approval: BrainApproval,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // executionLogs.status enum: "planned"|"running"|"completed"|"failed"|"blocked"
    // Approvals map to: approved → "completed", rejected → "failed"
    await db.insert(executionLogs).values({
      companyId:  approval.companyId,
      proposalId: approval.proposalId ?? null,
      taskId:     approval.taskId,
      actionType: "brain_approval",
      status:     approval.approved ? "completed" : "failed",
      executor:   approval.approvedBy,
      summary:    approval.approved
        ? `Approved by ${approval.approvedBy}${approval.note ? `: ${approval.note}` : ""}`
        : `Rejected by ${approval.approvedBy}${approval.note ? `: ${approval.note}` : ""}`,
      payload: {
        taskId:     approval.taskId,
        approvedBy: approval.approvedBy,
        approved:   approval.approved,
        note:       approval.note ?? null,
        createdAt:  approval.createdAt,
      },
      createdAt: new Date(),
    });

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { ok: false, error: message };
  }
}

/**
 * Retrieve the latest approval record for a given taskId.
 * Returns null if no approval has been recorded yet.
 */
export async function getLatestApproval(
  companyId: number,
  taskId: string,
): Promise<BrainApproval | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const { desc, eq, and } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(executionLogs)
      .where(
        and(
          eq(executionLogs.companyId, companyId),
          eq(executionLogs.actionType, "brain_approval"),
        ),
      )
      .orderBy(desc(executionLogs.createdAt))
      .limit(20);

    // Filter by taskId in the payload (can't index jsonb in MySQL easily)
    const match = rows.find(
      r =>
        typeof r.payload === "object" &&
        r.payload !== null &&
        (r.payload as Record<string, unknown>)["taskId"] === taskId,
    );

    if (!match) return null;

    const p = match.payload as Record<string, unknown>;
    return {
      taskId:     String(p["taskId"] ?? taskId),
      companyId,
      proposalId: match.proposalId ?? undefined,
      approved:   Boolean(p["approved"]),
      approvedBy: String(p["approvedBy"] ?? "unknown"),
      note:       typeof p["note"] === "string" ? p["note"] : undefined,
      createdAt:  String(p["createdAt"] ?? match.createdAt?.toISOString() ?? ""),
    };
  } catch {
    return null;
  }
}
