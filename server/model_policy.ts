/**
 * Model Policy
 * ──────────────────────────────────────────────────────────────────────────────
 * Centralized routing policy for LLM provider selection.
 * Decides whether a given call should use a local model or the cloud,
 * and records the reason so every LLM call is fully auditable.
 *
 * Current reality: both paths route to Forge (cloud) until a real local
 * model is configured. The policy layer still runs, so the audit trail
 * and escalation reasons are recorded from day one.
 */

export type ModelProvider = "local" | "cloud";

/**
 * 7 canonical reasons that can force a call to cloud instead of local.
 * Multiple reasons may apply simultaneously.
 */
export type PolicyReason =
  | "offline_default"          // no escalation trigger → use local (or best available)
  | "complex_reasoning"        // multi-step chain-of-thought required
  | "high_risk_review"         // compliance / legal / financial risk agent
  | "multilingual_output"      // Arabic output required with high fidelity
  | "structured_json"          // strict JSON schema output needed
  | "high_confidence_required" // prior confidence below threshold → escalate
  | "escalation_trigger";      // overall deliberation was escalated

export interface ModelRouteDecision {
  provider: ModelProvider;
  reasons: PolicyReason[];
  policyVersion: string;
}

/**
 * Context fields the caller provides to influence routing.
 * All fields are optional — omitting them means "no special requirement".
 */
export interface PolicyContext {
  taskType?: string;
  agentId?: string;
  isHighRisk?: boolean;
  requiresMultilingual?: boolean;
  requiresStructuredJson?: boolean;
  priorConfidence?: number;  // 0-1; triggers "high_confidence_required" if < 0.5
  isEscalated?: boolean;
  isComplexReasoning?: boolean;
}

const POLICY_VERSION = "1.0";

// Agent IDs that are always treated as high-risk reviewers
const HIGH_RISK_AGENTS = new Set(["compliance", "budget", "watchman"]);

// Task types that require complex multi-step reasoning
const COMPLEX_TASK_TYPES = new Set(["strategy", "futurist", "research"]);

/**
 * Decides the model provider (local vs cloud) and records all reasons.
 * Returns a ModelRouteDecision that must be logged in the audit trail.
 */
export function decideModelRoute(ctx: PolicyContext): ModelRouteDecision {
  const reasons: PolicyReason[] = [];
  let escalateToCloud = false;

  // 1. Agent identity — compliance/budget/watchman always get cloud
  if (ctx.agentId && HIGH_RISK_AGENTS.has(ctx.agentId)) {
    escalateToCloud = true;
    reasons.push("high_risk_review");
  }

  // 2. Explicit high-risk flag
  if (ctx.isHighRisk && !reasons.includes("high_risk_review")) {
    escalateToCloud = true;
    reasons.push("high_risk_review");
  }

  // 3. Task type — strategy / futurist / research need deeper reasoning
  if (
    ctx.taskType &&
    COMPLEX_TASK_TYPES.has(ctx.taskType) &&
    !reasons.includes("complex_reasoning")
  ) {
    escalateToCloud = true;
    reasons.push("complex_reasoning");
  }

  // 4. Explicit complex reasoning flag
  if (ctx.isComplexReasoning && !reasons.includes("complex_reasoning")) {
    escalateToCloud = true;
    reasons.push("complex_reasoning");
  }

  // 5. Multilingual (Arabic) output
  if (ctx.requiresMultilingual) {
    escalateToCloud = true;
    reasons.push("multilingual_output");
  }

  // 6. Strict structured JSON required
  if (ctx.requiresStructuredJson) {
    escalateToCloud = true;
    reasons.push("structured_json");
  }

  // 7. Prior confidence too low — escalate for second opinion
  if (ctx.priorConfidence !== undefined && ctx.priorConfidence < 0.5) {
    escalateToCloud = true;
    reasons.push("high_confidence_required");
  }

  // 8. Deliberation-level escalation
  if (ctx.isEscalated) {
    escalateToCloud = true;
    reasons.push("escalation_trigger");
  }

  // If nothing triggered, stay on local (offline default)
  if (reasons.length === 0) {
    reasons.push("offline_default");
  }

  return {
    provider: escalateToCloud ? "cloud" : "local",
    reasons,
    policyVersion: POLICY_VERSION,
  };
}
