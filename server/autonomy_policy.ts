/**
 * Autonomy Policy
 * ──────────────────────────────────────────────────────────────────────────────
 * Single function that decides the autonomy level for any BrainTask.
 * Replaces the hardcoded `requiresHumanApproval: true / executionAllowed: false`
 * that was previously scattered across the orchestrator.
 *
 * Levels:
 *   L1 — Insight only. No recommendation, no execution.
 *   L2 — Recommendation only. No execution, no approval gate.
 *   L3 — Requires explicit human approval before execution.
 *   L4 — Auto-execute when confidence is high and risk is low.
 *   L5 — Full autonomy — execute immediately, no human gate.
 *        (reserved for future, not assigned by default to any task type)
 *
 * Override order (highest priority first):
 *   1. riskScore ≥ 0.8                    → always L1
 *   2. taskType === "compliance"           → always L1
 *   3. High-confidence, low-risk optimiz. → L4 (auto-execute)
 *   4. Per-task default from DEFAULT_LEVEL_BY_TASK
 */

import {
  BrainTask,
  AutonomyLevel,
  AutonomyPolicyDecision,
} from "./orchestration_contract";

export interface AutonomyContext {
  task: BrainTask;
  confidence: number; // 0-1
  riskScore: number;  // 0-1
}

// ─── Per-task-type default autonomy level ────────────────────────────────────
const DEFAULT_LEVEL_BY_TASK: Record<BrainTask["type"], AutonomyLevel> = {
  strategy:     "L2", // recommend only — strategy changes need human review
  content:      "L3", // needs approval — published content is irreversible
  campaign:     "L3", // needs approval — spends real budget
  analytics:    "L2", // read-only insight
  research:     "L2", // informational
  compliance:   "L1", // insight only — compliance is never auto-executed
  budget:       "L2", // recommendation only — financial decisions stay human
  community:    "L3", // approval before posting/responding
  watchman:     "L2", // monitoring insights, not actions
  optimization: "L4", // auto-execute if confidence + risk thresholds met
  support:      "L3", // customer-facing requires approval
  futurist:     "L2", // strategic forecast — recommend only
};

// ─── Thresholds for L4 auto-execution ────────────────────────────────────────
const L4_MIN_CONFIDENCE = 0.80;
const L4_MAX_RISK       = 0.35;

/**
 * Decide the autonomy level and corresponding execution flags for a given task.
 * Returns a typed AutonomyPolicyDecision that the orchestrator uses to set
 * BrainDecision.requiresHumanApproval and BrainDecision.executionAllowed.
 */
export function decideAutonomy(ctx: AutonomyContext): AutonomyPolicyDecision {
  // ── 1. Hard override: extremely high risk ──────────────────────────────────
  if (ctx.riskScore >= 0.8) {
    return {
      level:                 "L1",
      executionAllowed:      false,
      requiresHumanApproval: true,
      reasoning: `High risk score (${(ctx.riskScore * 100).toFixed(0)}%) — forced to L1 insight-only`,
    };
  }

  // ── 2. Hard override: compliance is always insight-only ───────────────────
  if (ctx.task.type === "compliance") {
    return {
      level:                 "L1",
      executionAllowed:      false,
      requiresHumanApproval: true,
      reasoning: "Compliance tasks never auto-execute (L1 policy)",
    };
  }

  // ── 3. Conditional L4: optimization with high confidence + low risk ───────
  if (
    ctx.task.type === "optimization" &&
    ctx.confidence >= L4_MIN_CONFIDENCE &&
    ctx.riskScore  <= L4_MAX_RISK
  ) {
    return {
      level:                 "L4",
      executionAllowed:      true,
      requiresHumanApproval: false,
      reasoning: `Optimization passed L4 threshold: confidence=${(ctx.confidence * 100).toFixed(0)}%, risk=${(ctx.riskScore * 100).toFixed(0)}%`,
    };
  }

  // ── 4. Default level per task type ────────────────────────────────────────
  const level = DEFAULT_LEVEL_BY_TASK[ctx.task.type];

  switch (level) {
    case "L1":
      return {
        level,
        executionAllowed:      false,
        requiresHumanApproval: true,
        reasoning: `Task type "${ctx.task.type}" defaults to L1 insight-only`,
      };

    case "L2":
      return {
        level,
        executionAllowed:      false,
        requiresHumanApproval: false,
        reasoning: `Task type "${ctx.task.type}" defaults to L2 recommendation-only`,
      };

    case "L3":
      return {
        level,
        executionAllowed:      false,
        requiresHumanApproval: true,
        reasoning: `Task type "${ctx.task.type}" requires human approval before execution`,
      };

    case "L4":
      return {
        level,
        executionAllowed:      true,
        requiresHumanApproval: false,
        reasoning: `Task type "${ctx.task.type}" defaults to L4 autonomous execution`,
      };

    case "L5":
      return {
        level,
        executionAllowed:      true,
        requiresHumanApproval: false,
        reasoning: `Task type "${ctx.task.type}" operates at full L5 autonomy`,
      };
  }
}
