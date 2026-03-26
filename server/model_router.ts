/**
 * Model Router
 * ──────────────────────────────────────────────────────────────────────────────
 * Single gate for ALL LLM calls made by brain agents.
 *
 * Usage:
 *   import { invokeRoutedLLM } from "./model_router";
 *   const result = await invokeRoutedLLM({
 *     messages: [{ role: "system", content: "..." }, { role: "user", content: "..." }],
 *     agentId: "compliance",
 *     taskType: "strategy",
 *     requiresStructuredJson: true,
 *   });
 *   // result.routing  → { provider, reasons, policyVersion }
 *   // result.choices  → normal LLM response
 *
 * Architecture note:
 *   Today both "local" and "cloud" routes call invokeLLM() (Forge / cloud).
 *   When a local model endpoint is available, switch the invokeLocalLLM()
 *   branch below to point at it — zero changes needed in callers.
 */

import { invokeLLM, InvokeResult, Message, ResponseFormat } from "./_core/llm";
import {
  decideModelRoute,
  ModelRouteDecision,
  PolicyContext,
} from "./model_policy";

// ─── Simplified message type for routed calls ─────────────────────────────────
// Brain agents only need system/user/assistant roles and plain string content.
// Callers that need multimodal content should use invokeLLM() directly.
export interface RoutedMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── Routed invocation params ─────────────────────────────────────────────────
export interface RoutedInvokeParams extends PolicyContext {
  messages: RoutedMessage[];
  responseFormat?: ResponseFormat;
  maxTokens?: number;
  /** Sampling temperature (0-2). Passed through to LLM. Default: model default. */
  temperature?: number;
  /** Audit metadata — not used for routing, recorded for traceability. */
  action?: string;
  stage?: string;
}

// ─── Routed result — standard InvokeResult + routing audit ───────────────────
export interface RoutedInvokeResult extends InvokeResult {
  routing: ModelRouteDecision;
}

// ─── Internal: cloud implementation ──────────────────────────────────────────
async function invokeCloudLLM(
  messages: RoutedMessage[],
  responseFormat?: ResponseFormat,
  maxTokens?: number,
  temperature?: number,
): Promise<InvokeResult> {
  return invokeLLM({
    messages: messages as Message[],
    ...(responseFormat ? { responseFormat } : {}),
    ...(maxTokens ? { maxTokens } : {}),
    ...(typeof temperature === "number" ? { temperature } : {}),
  });
}

// ─── Internal: local implementation ──────────────────────────────────────────
// Stub — falls back to cloud until a real local model is wired in.
// To wire a local model: replace the body with a call to your local endpoint.
async function invokeLocalLLM(
  messages: RoutedMessage[],
  responseFormat?: ResponseFormat,
  maxTokens?: number,
  temperature?: number,
): Promise<InvokeResult> {
  // TODO: replace with local model call when available
  // e.g. call http://localhost:11434/api/chat (Ollama) or similar
  return invokeCloudLLM(messages, responseFormat, maxTokens, temperature);
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Invoke the LLM with automatic provider routing based on policy.
 * Every call is tagged with a ModelRouteDecision for full auditability.
 */
export async function invokeRoutedLLM(
  params: RoutedInvokeParams,
): Promise<RoutedInvokeResult> {
  const {
    messages,
    responseFormat,
    maxTokens,
    temperature,
    // audit metadata — not used for routing
    action: _action,
    stage: _stage,
    // PolicyContext fields
    taskType,
    agentId,
    isHighRisk,
    requiresMultilingual,
    requiresStructuredJson,
    priorConfidence,
    isEscalated,
    isComplexReasoning,
  } = params;

  const policyCtx: PolicyContext = {
    taskType,
    agentId,
    isHighRisk,
    requiresMultilingual,
    requiresStructuredJson,
    priorConfidence,
    isEscalated,
    isComplexReasoning,
  };

  const routing = decideModelRoute(policyCtx);

  const result =
    routing.provider === "local"
      ? await invokeLocalLLM(messages, responseFormat, maxTokens, temperature)
      : await invokeCloudLLM(messages, responseFormat, maxTokens, temperature);

  return { ...result, routing };
}
