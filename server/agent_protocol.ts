/**
 * Agent Communication Protocol
 * ──────────────────────────────────────────────────────────────────────────────
 * Defines the typed contract for every agent invocation:
 *   AgentInputEnvelope  — what goes into the LLM call
 *   AgentOutputEnvelope — what must come back
 *   validateAgentOutput — hard validation before any result is accepted
 *
 * No agent output is accepted unless it passes validateAgentOutput().
 * Any failure produces a fallback receipt instead of a parse error.
 */

import { BrainTaskType } from "./orchestration_contract";

// ─── Recommendation enum ──────────────────────────────────────────────────────
export type AgentRecommendation = "approve" | "reject" | "needs_revision";

// ─── Input Envelope ───────────────────────────────────────────────────────────
export interface AgentInputEnvelope {
  taskId: string;
  agentId: BrainTaskType;
  context: {
    proposal: string;
    memoryContext?: string;
    constraints?: string[];
  };
  instructions: string;
}

// ─── Output Envelope ──────────────────────────────────────────────────────────
export interface AgentOutputEnvelope {
  agentId: BrainTaskType | string;
  opinion: string;
  recommendation: AgentRecommendation;
  confidence: number;   // 0-1
  risk: number;         // 0-1 (0 = no risk, 1 = maximum risk)
  concerns: string[];
  suggestions: string[];
  structured?: Record<string, unknown>;
}

// ─── Output Validation ────────────────────────────────────────────────────────
export function validateAgentOutput(raw: unknown): {
  valid: boolean;
  output?: AgentOutputEnvelope;
  reason?: string;
} {
  if (!raw || typeof raw !== "object") {
    return { valid: false, reason: "response is not an object" };
  }

  const o = raw as Record<string, unknown>;

  if (!o.agentId || typeof o.agentId !== "string") {
    return { valid: false, reason: "missing or invalid agentId" };
  }

  if (!o.opinion || typeof o.opinion !== "string" || o.opinion.trim().length < 10) {
    return { valid: false, reason: "missing or too-short opinion" };
  }

  if (!o.recommendation || typeof o.recommendation !== "string") {
    return { valid: false, reason: "missing recommendation" };
  }

  const validRecs: AgentRecommendation[] = ["approve", "reject", "needs_revision"];
  if (!validRecs.includes(o.recommendation as AgentRecommendation)) {
    return {
      valid: false,
      reason: `recommendation "${o.recommendation}" not in ["approve","reject","needs_revision"]`,
    };
  }

  if (typeof o.confidence !== "number" || o.confidence < 0 || o.confidence > 1) {
    return { valid: false, reason: "confidence must be a number 0-1" };
  }

  if (typeof o.risk !== "number" || o.risk < 0 || o.risk > 1) {
    return { valid: false, reason: "risk must be a number 0-1" };
  }

  if (!Array.isArray(o.concerns)) {
    return { valid: false, reason: "concerns must be an array" };
  }

  if (!Array.isArray(o.suggestions)) {
    return { valid: false, reason: "suggestions must be an array" };
  }

  return {
    valid: true,
    output: {
      agentId:        o.agentId as BrainTaskType,
      opinion:        o.opinion as string,
      recommendation: o.recommendation as AgentRecommendation,
      confidence:     o.confidence as number,
      risk:           o.risk as number,
      concerns:       (o.concerns as unknown[]).map(String),
      suggestions:    (o.suggestions as unknown[]).map(String),
      structured:     typeof o.structured === "object" && o.structured !== null
        ? (o.structured as Record<string, unknown>)
        : undefined,
    },
  };
}

// ─── JSON schema instruction (appended to every agent system prompt) ──────────
// This is the ground truth for what the LLM must produce.
export const AGENT_JSON_INSTRUCTION = `

You MUST return ONLY a valid JSON object. No text, markdown, or explanation outside the JSON.
The JSON must match this exact schema:

{
  "agentId": "<your agent id>",
  "opinion": "<2-3 paragraph professional assessment>",
  "recommendation": "<exactly one of: approve | reject | needs_revision>",
  "confidence": <0.0 to 1.0>,
  "risk": <0.0 to 1.0 — 0 = no risk, 1 = maximum risk>,
  "concerns": ["<concern 1>", "<concern 2>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>"]
}

Rules:
- recommendation MUST be exactly "approve", "reject", or "needs_revision"
- confidence and risk MUST be numbers between 0 and 1
- concerns and suggestions MUST be arrays of strings
- No additional top-level keys required, but structured{} is allowed for extra detail
`;
