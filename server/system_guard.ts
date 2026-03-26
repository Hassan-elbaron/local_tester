/**
 * System Guard — Integrity Layer
 * ──────────────────────────────────────────────────────────────────────────────
 * Last line of defense against:
 *   - Duplicate task execution (same proposal run twice)
 *   - Infinite deliberation loops (runaway agent rounds)
 *   - Invalid state transitions (brain pipeline jumps)
 *   - Overload (too many concurrent runs per company)
 *
 * All guards return a GuardResult instead of throwing, so the caller decides
 * how to surface the failure (block, log, or abort cleanly).
 *
 * Guards are stateless except for preventDuplicateExecution which reads DB.
 */

import { getDb } from "./db";
import { executionLogs } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { BrainStage } from "./orchestration_contract";

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

// ─── 1. Duplicate Execution Guard ─────────────────────────────────────────────
// Prevents the same task from being executed more than once by checking
// the decision ledger (brain_run rows) and execution rows.
export async function preventDuplicateExecution(params: {
  companyId: number;
  taskId:    string;
  /** Pass "brain_run" to block re-deliberation; "webhook" etc. to block re-execution */
  actionType?: string;
}): Promise<GuardResult> {
  const db = await getDb();
  if (!db) return { allowed: true }; // DB unavailable → fail-open (don't block)

  const actionType = params.actionType ?? "brain_run";

  const rows = await db
    .select({ id: executionLogs.id })
    .from(executionLogs)
    .where(
      and(
        eq(executionLogs.companyId,   params.companyId),
        eq(executionLogs.taskId,      params.taskId),
        eq(executionLogs.actionType,  actionType),
      ),
    )
    .limit(1);

  if (rows.length > 0) {
    return {
      allowed: false,
      reason: `Duplicate blocked: task "${params.taskId}" already has a "${actionType}" record (id=${rows[0].id})`,
    };
  }

  return { allowed: true };
}

// ─── 2. Infinite Loop Guard ────────────────────────────────────────────────────
// Caps the number of deliberation rounds a single run can execute.
// The default max is 10 — enough for any realistic deliberation scenario.
const MAX_DELIBERATION_ROUNDS = 10;

export function preventInfiniteLoop(params: {
  iterationCount: number;
  max?: number;
}): GuardResult {
  const limit = params.max ?? MAX_DELIBERATION_ROUNDS;

  if (params.iterationCount >= limit) {
    return {
      allowed: false,
      reason:  `Loop guard: reached max ${limit} deliberation rounds (iterationCount=${params.iterationCount})`,
    };
  }

  return { allowed: true };
}

// ─── 3. State Transition Guard ─────────────────────────────────────────────────
// Enforces the canonical BrainStage pipeline order.
// Unknown source stages are allowed to transition to anything (forward-compat).
const ALLOWED_TRANSITIONS: Partial<Record<BrainStage, BrainStage[]>> = {
  intake:          ["context_build"],
  context_build:   ["deliberation"],
  deliberation:    ["decision"],
  decision:        ["execution_plan"],
  execution_plan:  ["execution_run"],
  execution_run:   ["memory_write"],
  memory_write:    ["done"],
};

export function validateStateTransition(params: {
  from: BrainStage;
  to:   BrainStage;
}): GuardResult {
  const allowed = ALLOWED_TRANSITIONS[params.from];

  // Unknown source stage — allow (forward-compatibility)
  if (!allowed) return { allowed: true };

  if (!allowed.includes(params.to)) {
    return {
      allowed: false,
      reason:  `Invalid state transition: "${params.from}" → "${params.to}" (allowed: ${allowed.join(", ")})`,
    };
  }

  return { allowed: true };
}

// ─── 4. Concurrent Run Overload Guard ─────────────────────────────────────────
// In-memory counter per companyId — prevents more than N simultaneous
// deliberations for the same company (mitigates accidental hammering).
const MAX_CONCURRENT_PER_COMPANY = 3;
const _activeCounts = new Map<number, number>();

export function acquireRunSlot(companyId: number): GuardResult {
  const current = _activeCounts.get(companyId) ?? 0;

  if (current >= MAX_CONCURRENT_PER_COMPANY) {
    return {
      allowed: false,
      reason:  `Overload guard: company ${companyId} already has ${current} active deliberations (max=${MAX_CONCURRENT_PER_COMPANY})`,
    };
  }

  _activeCounts.set(companyId, current + 1);
  return { allowed: true };
}

export function releaseRunSlot(companyId: number): void {
  const current = _activeCounts.get(companyId) ?? 0;
  const next    = Math.max(0, current - 1);
  if (next === 0) {
    _activeCounts.delete(companyId);
  } else {
    _activeCounts.set(companyId, next);
  }
}
