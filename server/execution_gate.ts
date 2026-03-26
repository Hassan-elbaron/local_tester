/**
 * Execution Gate
 * ──────────────────────────────────────────────────────────────────────────────
 * Hard guard between a BrainDecision and any external or internal execution.
 * Every execution call MUST pass through validateExecutionGate() first.
 * If the gate rejects, the caller must produce a "blocked" ExecutionReceipt
 * instead of attempting execution.
 *
 * Rules (evaluated in order):
 *   1. decision.executionAllowed must be true
 *   2. decision.requiresHumanApproval must be false
 *   3. decision.status must be "approved"
 *   4. decision.taskId must match request.taskId
 *
 * Any failure produces a clear, auditable reason string.
 */

import {
  BrainDecision,
  BrainExecutionRequest,
  ExecutionGateResult,
} from "./orchestration_contract";

export function validateExecutionGate(
  decision: BrainDecision,
  request: BrainExecutionRequest,
): ExecutionGateResult {
  if (!decision.executionAllowed) {
    return {
      allowed: false,
      reason: "Decision does not allow execution (executionAllowed=false)",
    };
  }

  if (decision.requiresHumanApproval) {
    return {
      allowed: false,
      reason: "Human approval still required before execution",
    };
  }

  if (decision.status !== "approved") {
    return {
      allowed: false,
      reason: `Decision status is "${decision.status}", not "approved"`,
    };
  }

  if (decision.taskId !== request.taskId) {
    return {
      allowed: false,
      reason: `TaskId mismatch: decision.taskId="${decision.taskId}", request.taskId="${request.taskId}"`,
    };
  }

  return {
    allowed: true,
    reason: "All gate checks passed — execution allowed",
  };
}
