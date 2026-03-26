/**
 * Flow Execution Payload Builders
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed payload constructors for each proposalType → adapter target.
 * Each builder prefers structured executionMetadata from the flow,
 * and falls back to parsing from proposalContext if metadata is absent.
 *
 * This file contains NO business logic — only payload shaping.
 * Called by buildExecutionRequest() in orchestrator.ts.
 */

import type { BrainDecision } from "./orchestration_contract";

// ─── Shared helper ────────────────────────────────────────────────────────────
function parseLine(context: string, prefix: string): string | undefined {
  const line = context.split("\n").find(l =>
    l.toLowerCase().startsWith(prefix.toLowerCase()),
  );
  return line ? line.slice(prefix.length).trim() || undefined : undefined;
}

// ─── Campaign → Meta Ads ──────────────────────────────────────────────────────
export function buildCampaignExecutionPayload(
  context: string,
  decision: BrainDecision | undefined,
  meta?: Record<string, unknown>,
) {
  const brandName    = String(meta?.["brandName"]    ?? parseLine(context, "Brand:")          ?? "Unknown Brand");
  const campaignGoal = String(meta?.["campaignGoal"] ?? parseLine(context, "Campaign Goal:")  ?? "Awareness");
  const audience     = String(meta?.["audience"]     ?? parseLine(context, "Audience:")       ?? "");
  const budget       = String(meta?.["budget"]       ?? parseLine(context, "Budget:")         ?? "");
  const channels     = String(meta?.["channels"]     ?? parseLine(context, "Channels:")       ?? "");
  const offer        = String(meta?.["offer"]        ?? parseLine(context, "Offer:")          ?? "");
  const timeline     = String(meta?.["timeline"]     ?? parseLine(context, "Timeline:")       ?? "");

  return {
    objective: "OUTCOME_TRAFFIC",
    name:      `${brandName} — ${campaignGoal}`,
    metadata: {
      brandName,
      campaignGoal,
      audience:       audience  || null,
      budget:         budget    || null,
      channels:       channels  || null,
      offer:          offer     || null,
      timeline:       timeline  || null,
      recommendation: decision?.recommendation ?? null,
      confidence:     decision?.confidence     ?? null,
    },
  };
}

// ─── Content → CMS ───────────────────────────────────────────────────────────
export function buildContentExecutionPayload(
  context: string,
  decision: BrainDecision | undefined,
  meta?: Record<string, unknown>,
) {
  const brandName        = String(meta?.["brandName"]        ?? parseLine(context, "Brand:")             ?? "Unknown Brand");
  const contentGoal      = String(meta?.["contentGoal"]      ?? parseLine(context, "Content Goal:")      ?? "");
  const channels         = String(meta?.["channels"]         ?? parseLine(context, "Channels:")          ?? "");
  const contentPillars   = String(meta?.["contentPillars"]   ?? parseLine(context, "Content Pillars:")   ?? "");
  const postingFrequency = String(meta?.["postingFrequency"] ?? parseLine(context, "Posting Frequency:") ?? "");
  const notes            = String(meta?.["notes"]            ?? parseLine(context, "Notes:")             ?? "");

  const body = [
    `Brand: ${brandName}`,
    contentGoal      ? `Goal: ${contentGoal}`                    : null,
    channels         ? `Channels: ${channels}`                   : null,
    contentPillars   ? `Content Pillars: ${contentPillars}`      : null,
    postingFrequency ? `Posting Frequency: ${postingFrequency}`  : null,
    notes            ? `Notes: ${notes}`                         : null,
    decision?.recommendation ? `Recommendation: ${decision.recommendation}` : null,
  ].filter(Boolean).join("\n");

  return {
    action:  "create_draft" as const,
    title:   `${brandName} Content Calendar Draft`,
    content: body,
    status:  "draft" as const,
    metadata: {
      source:         "ai_marketing_brain_os",
      proposalType:   "content",
      brandName,
      contentGoal:    contentGoal || null,
      recommendation: decision?.recommendation ?? null,
    },
  };
}

// ─── Optimization → Webhook ───────────────────────────────────────────────────
export function buildOptimizationExecutionPayload(
  context: string,
  decision: BrainDecision | undefined,
  meta?: Record<string, unknown>,
) {
  const brandName          = String(meta?.["brandName"]          ?? parseLine(context, "Brand:")                ?? "Unknown Brand");
  const optimizationGoal   = String(meta?.["optimizationGoal"]   ?? parseLine(context, "Optimization Goal:")   ?? "");
  const currentPerformance = String(meta?.["currentPerformance"] ?? parseLine(context, "Current Performance:") ?? "");
  const bottlenecks        = String(meta?.["bottlenecks"]        ?? parseLine(context, "Bottlenecks:")         ?? "");
  const channels           = String(meta?.["channels"]           ?? parseLine(context, "Channels:")            ?? "");
  const notes              = String(meta?.["notes"]              ?? parseLine(context, "Notes:")               ?? "");

  return {
    brandName,
    optimizationGoal:   optimizationGoal   || null,
    currentPerformance: currentPerformance || null,
    bottlenecks:        bottlenecks        || null,
    channels:           channels           || null,
    notes:              notes              || null,
    recommendation:     decision?.recommendation ?? null,
    confidence:         decision?.confidence     ?? null,
    riskScore:          decision?.riskScore      ?? null,
    metadata: {
      source:       "ai_marketing_brain_os",
      proposalType: "optimization",
    },
  };
}

// ─── Support → SendGrid Email ─────────────────────────────────────────────────
export function buildSupportExecutionPayload(
  context: string,
  decision: BrainDecision | undefined,
  meta?: Record<string, unknown>,
) {
  const brandName = String(meta?.["brandName"] ?? parseLine(context, "Brand:") ?? "Unknown Brand");

  const body = [
    context.slice(0, 3000),
    "",
    decision?.recommendation
      ? `AI Recommendation: ${decision.recommendation}`
      : null,
    decision?.confidence != null
      ? `Confidence: ${Math.round(decision.confidence * 100)}%`
      : null,
  ].filter(Boolean).join("\n");

  return {
    to:      process.env.TEAM_EMAIL ?? "team@example.com",
    subject: `AI Marketing — ${brandName} support action required`,
    body,
  };
}

// ─── Community → CRM ─────────────────────────────────────────────────────────
export function buildCommunityExecutionPayload(
  context: string,
  decision: BrainDecision | undefined,
  meta?: Record<string, unknown>,
) {
  const brandName = String(meta?.["brandName"] ?? parseLine(context, "Brand:") ?? "Unknown Brand");

  const note = [
    context.slice(0, 1500),
    "",
    decision?.recommendation
      ? `AI Recommendation: ${decision.recommendation}`
      : null,
  ].filter(Boolean).join("\n").slice(0, 2000);

  return {
    action:  "create_lead" as const,
    name:    "Community Lead",
    email:   undefined,
    company: brandName,
    note,
    metadata: {
      source:         "ai_marketing_brain_os",
      proposalType:   "community",
      recommendation: decision?.recommendation ?? null,
    },
  };
}
