/**
 * Orchestrator Engine
 * - Contextual Agent Routing: selects agents by proposal type + complexity
 * - Weighted Deliberation: each agent has a weight per domain
 * - Multi-Round: Proposal → Critique → Revision → Scoring → Final
 * - Dissent Visibility: surfaces minority opinions explicitly
 * - Traceable Decision Flow: full audit of who/why/what/outcome
 * - Escalation Logic: stops and flags if confidence < threshold or conflict > threshold
 */

import { invokeLLM } from "./_core/llm";
import { invokeRoutedLLM } from "./model_router";
import { decideAutonomy } from "./autonomy_policy";
import { persistBrainRunLedger } from "./decision_ledger";
import {
  preventDuplicateExecution,
  preventInfiniteLoop,
  acquireRunSlot,
  releaseRunSlot,
} from "./system_guard";
import { validateExecutionGate } from "./execution_gate";
import {
  runExecutionWithReceipt,
  persistExecutionReceipt,
} from "./execution_receipts";
import {
  buildHybridMemoryContext,
  extractLearningFromRun,
  writeHybridMemories,
} from "./hybrid_memory";
import {
  AgentInputEnvelope,
  AgentOutputEnvelope,
  validateAgentOutput,
  AGENT_JSON_INSTRUCTION,
} from "./agent_protocol";
import { AgentOpinionResult } from "./agents";
import {
  CANONICAL_AGENTS,
  CanonicalAgent,
  getCanonicalAgentsByTask,
} from "./canonical_agents";
import { getCompanyMemory, createDeliberation, saveAgentOpinion, updateDeliberation } from "./db";
import { buildIntelligenceContext } from "./intelligence";
import { buildCompanyContext } from "./knowledge";
import {
  BrainTask,
  BrainDecision,
  BrainEvidence,
  BrainExecutionRequest,
  BrainRunResult,
  BrainTaskType,
  DeliberationBundle,
  ExecutionReceipt,
  MemoryWriteRequest,
} from "./orchestration_contract";
import {
  buildCampaignExecutionPayload,
  buildContentExecutionPayload,
  buildOptimizationExecutionPayload,
  buildSupportExecutionPayload,
  buildCommunityExecutionPayload,
} from "./flow_execution_payloads";

// ─── Canonical Task → Agent Weights ──────────────────────────────────────────
// Keyed by BrainTaskType; values are per-agent weight overrides (0-1).
// Agents not listed fall back to their defaultWeight in CANONICAL_AGENTS.
const TASK_AGENT_WEIGHTS: Record<BrainTaskType, Partial<Record<BrainTaskType, number>>> = {
  strategy:     { strategy: 1.0, research: 0.95, analytics: 0.85, compliance: 0.8,  budget: 0.85, futurist: 0.75 },
  content:      { content:  1.0, strategy: 0.8,  research:  0.75, analytics:  0.7,  compliance: 0.75 },
  campaign:     { campaign: 1.0, strategy: 0.85, analytics: 0.85, budget:     0.9,  compliance: 0.8, optimization: 0.9, watchman: 0.7 },
  analytics:    { analytics:1.0, strategy: 0.7,  optimization:0.85,watchman:  0.8,  compliance: 0.65 },
  research:     { research: 1.0, strategy: 0.85, futurist:   0.75, analytics: 0.7  },
  compliance:   { compliance:1.0,strategy: 0.7,  campaign:   0.65, content:   0.65, budget: 0.7 },
  budget:       { budget:   1.0, strategy: 0.85, campaign:   0.8,  analytics: 0.85, compliance: 0.75 },
  community:    { community:1.0, content:  0.8,  support:    0.8,  analytics: 0.7,  watchman: 0.7 },
  watchman:     { watchman: 1.0, analytics:0.85, compliance: 0.8,  optimization:0.7 },
  optimization: { optimization:1.0, analytics:0.9, campaign: 0.8,  content:   0.7,  watchman: 0.75 },
  support:      { support:  1.0, community:0.85, content:    0.7,  compliance: 0.7  },
  futurist:     { futurist: 1.0, strategy: 0.85, research:   0.85, watchman:  0.65  },
};

// ─── Deliberation Rounds ──────────────────────────────────────────────────────
export type DeliberationRound = "proposal" | "critique" | "revision" | "scoring" | "final";

export interface OrchestratedOpinion extends AgentOpinionResult {
  weight: number;
  weightedScore: number;
  round: DeliberationRound;
  dissent: boolean; // true if this agent is in the minority
}

export interface DissentSummary {
  agentName: string;
  agentRole: string;
  concern: string;
  weight: number;
}

export interface OrchestratedDeliberationResult {
  proposalId: number;
  companyId: number;
  deliberationId: number;
  rounds: { round: DeliberationRound; opinions: OrchestratedOpinion[] }[];
  selectedAgents: { role: string; name: string; weight: number }[];
  weightedConsensusScore: number;
  dissentSummary: DissentSummary[];
  finalRecommendation: string;
  finalRecommendationAr: string;
  decisionTrace: DecisionTrace;
  escalated: boolean;
  escalationReason?: string;
  summary: string;
  summaryAr: string;
  brainRun: BrainRunResult;
  /** Set when a system guard blocked the run before deliberation started */
  guardBlocked?: { guard: string; reason: string };
}

export interface DecisionTrace {
  routing: { reason: string; agentsSelected: string[]; agentsExcluded: string[] };
  rounds: { round: string; keyInsights: string[]; consensusShift: number }[];
  finalDecision: { chosenOption: string; reason: string; confidence: number; dissents: number };
}

// ─── Task Type Normalizer ─────────────────────────────────────────────────────
// Maps legacy proposal type strings → canonical BrainTaskType
function normalizeTaskType(proposalType: string): BrainTaskType {
  const v = proposalType.toLowerCase().trim();
  const map: Record<string, BrainTaskType> = {
    strategy:    "strategy",
    content:     "content",
    campaign:    "campaign",
    paid_media:  "campaign",
    seo:         "content",
    crm:         "community",
    funnel:      "optimization",
    analytics:   "analytics",
    research:    "research",
    compliance:  "compliance",
    budget:      "budget",
    community:   "community",
    watchman:    "watchman",
    optimization:"optimization",
    support:     "support",
    futurist:    "futurist",
  };
  return map[v] ?? "strategy";
}

// ─── Agent Selection (Canonical Routing) ─────────────────────────────────────
function selectAgents(
  proposalType: string,
  budget?: number,
): { agent: CanonicalAgent; weight: number }[] {
  const taskType  = normalizeTaskType(proposalType);
  const pool      = getCanonicalAgentsByTask(taskType);
  const weights   = TASK_AGENT_WEIGHTS[taskType];
  const threshold = budget && budget > 100_000 ? 0.65 : 0.75; // high-budget = broader panel

  return pool
    .map(agent => ({
      agent,
      weight: weights[agent.id] ?? agent.defaultWeight,
    }))
    .filter(x => x.weight >= threshold)
    .sort((a, b) => b.weight - a.weight);
}

// ─── Fallback opinion (validation failure / parse error) ─────────────────────
function fallbackOpinion(
  agent: CanonicalAgent,
  weight: number,
  round: DeliberationRound,
  reason: string,
): OrchestratedOpinion {
  return {
    agentRole:       agent.id,
    agentName:       agent.name,
    opinion:         `Structured response invalid: ${reason}`,
    opinionAr:       "",
    recommendation:  "needs_revision",
    confidence:      0.2,
    risk:            0.8,
    concerns:        [reason],
    suggestions:     ["Fix agent output format before re-deliberation"],
    votedFor:        false,
    routing: {
      provider:      "local",
      reasons:       ["structured_json"],
      policyVersion: "offline-first-v1",
    },
    weight,
    weightedScore:   0,
    round,
    dissent:         false, // recalculated after round
  };
}

// ─── Single Agent Opinion (one round) ────────────────────────────────────────
async function getOpinion(
  agent: CanonicalAgent,
  weight: number,
  round: DeliberationRound,
  proposalContext: string,
  companyContext: string,
  previousSummary: string,
  taskType: BrainTaskType,
): Promise<OrchestratedOpinion> {
  const roundInstructions: Record<DeliberationRound, string> = {
    proposal: "Provide your initial professional assessment of this proposal.",
    critique: "Critically evaluate the proposal. Focus on risks, gaps, and weaknesses. Be direct.",
    revision: "Based on the critique round, suggest specific improvements and revised approach.",
    scoring:  "Score this proposal — set confidence and risk carefully.",
    final:    "Give your final weighted recommendation considering all previous rounds.",
  };

  // ── Build typed input envelope ──
  const inputEnvelope: AgentInputEnvelope = {
    taskId:  `${agent.id}_${round}_${Date.now()}`,
    agentId: agent.id,
    context: {
      proposal: [
        `COMPANY CONTEXT:\n${companyContext}`,
        `PROPOSAL:\n${proposalContext}`,
        previousSummary ? `PREVIOUS ROUND SUMMARY:\n${previousSummary}` : "",
        `ROUND: ${round.toUpperCase()}`,
        `INSTRUCTION: ${roundInstructions[round]}`,
        `Your domain weight for this decision type: ${weight.toFixed(2)} (higher = more relevant expertise)`,
      ].filter(Boolean).join("\n\n"),
    },
    instructions: roundInstructions[round],
  };

  try {
    const res = await invokeRoutedLLM({
      messages: [
        {
          role: "system",
          content: agent.systemPrompt + AGENT_JSON_INSTRUCTION,
        },
        {
          role: "user",
          content: JSON.stringify(inputEnvelope, null, 2),
        },
      ],
      agentId:              agent.id,
      taskType,
      action:               "recommend",
      stage:                "deliberation",
      temperature:          0.2,
      requiresStructuredJson: true,
      isHighRisk:
        agent.id === "compliance" ||
        agent.id === "budget"     ||
        agent.id === "watchman",
    });

    // ── Parse raw LLM response ──
    const rawContent = (res.choices?.[0]?.message?.content ?? "") as string;
    const clean = rawContent.replace(/```json\n?|\n?```/g, "").trim();

    let rawParsed: unknown;
    try {
      rawParsed = JSON.parse(clean);
    } catch {
      return fallbackOpinion(agent, weight, round, "LLM response is not valid JSON");
    }

    // ── Validate envelope ──
    const validation = validateAgentOutput(rawParsed);
    if (!validation.valid || !validation.output) {
      return fallbackOpinion(agent, weight, round, validation.reason ?? "invalid structure");
    }

    const parsed: AgentOutputEnvelope = validation.output;
    const approved = parsed.recommendation === "approve";

    return {
      agentRole:      agent.id,
      agentName:      agent.name,
      opinion:        parsed.opinion,
      opinionAr:      "",
      recommendation: parsed.recommendation,
      confidence:     parsed.confidence,
      risk:           parsed.risk,
      concerns:       parsed.concerns,
      suggestions:    parsed.suggestions,
      votedFor:       approved,
      routing:        res.routing,
      weight,
      weightedScore:  (approved ? 1 : 0) * weight,
      round,
      dissent:        false, // recalculated after all opinions are collected
    };
  } catch {
    return fallbackOpinion(agent, weight, round, "Unexpected error during agent invocation");
  }
}

// ─── Orchestration Contract Helpers ──────────────────────────────────────────
function nowIso(): string {
  return new Date().toISOString();
}

function makeTask(params: {
  companyId: number;
  proposalId: number;
  proposalType: string;
  proposalContext: string;
}): BrainTask {
  return {
    id: `task_${params.companyId}_${params.proposalId}_${Date.now()}`,
    companyId: params.companyId,
    proposalId: params.proposalId,
    type: normalizeTaskType(params.proposalType),
    action: "recommend",
    title: `Proposal ${params.proposalId} deliberation`,
    description: params.proposalContext,
    input: {
      proposalType: params.proposalType,
      proposalContext: params.proposalContext,
    },
    stage: "deliberation",
    createdAt: nowIso(),
  };
}

function buildEvidence(companyContext: string): BrainEvidence[] {
  return [
    {
      source: "db",
      key: "company_context",
      summary: "Merged company knowledge + intelligence context used in deliberation",
      payload: companyContext,
    },
  ];
}

// Task types that route to external connectors.
const META_ADS_EXECUTION_TYPES = new Set(["campaign"]);       // → Meta Ads Graph API
const CMS_EXECUTION_TYPES      = new Set(["content"]);        // → CMS webhook bridge
const WEBHOOK_EXECUTION_TYPES  = new Set(["optimization"]);   // → generic webhook
const SENDGRID_EXECUTION_TYPES = new Set(["support"]);      // → SendGrid v3 API
const CRM_EXECUTION_TYPES      = new Set(["community"]);  // → CRM webhook bridge

function buildExecutionRequest(params: {
  companyId:         number;
  proposalId:        number;
  taskId:            string;
  decision:          BrainDecision;
  proposalType:      string;
  proposalContext:   string;
  executionMetadata?: Record<string, unknown>;
}): BrainExecutionRequest {
  const taskType = normalizeTaskType(params.proposalType);
  const meta = params.executionMetadata;

  // ── SendGrid connector: support tasks ─────────────────────────────────────
  if (SENDGRID_EXECUTION_TYPES.has(taskType)) {
    return {
      companyId: params.companyId, proposalId: params.proposalId,
      taskId: params.taskId, decision: params.decision,
      mode: "external", target: "sendgrid_email",
      payload: buildSupportExecutionPayload(params.proposalContext, params.decision, meta),
    };
  }

  // ── CRM connector: community tasks ────────────────────────────────────────
  if (CRM_EXECUTION_TYPES.has(taskType)) {
    return {
      companyId: params.companyId, proposalId: params.proposalId,
      taskId: params.taskId, decision: params.decision,
      mode: "external", target: "crm",
      payload: buildCommunityExecutionPayload(params.proposalContext, params.decision, meta),
    };
  }

  // ── Meta Ads connector: campaign tasks ────────────────────────────────────
  if (META_ADS_EXECUTION_TYPES.has(taskType)) {
    return {
      companyId: params.companyId, proposalId: params.proposalId,
      taskId: params.taskId, decision: params.decision,
      mode: "external", target: "meta_ads",
      payload: buildCampaignExecutionPayload(params.proposalContext, params.decision, meta),
    };
  }

  // ── CMS connector: content tasks ──────────────────────────────────────────
  if (CMS_EXECUTION_TYPES.has(taskType)) {
    return {
      companyId: params.companyId, proposalId: params.proposalId,
      taskId: params.taskId, decision: params.decision,
      mode: "external", target: "cms",
      payload: buildContentExecutionPayload(params.proposalContext, params.decision, meta),
    };
  }

  // ── Webhook connector: optimization ───────────────────────────────────────
  if (WEBHOOK_EXECUTION_TYPES.has(taskType)) {
    return {
      companyId: params.companyId, proposalId: params.proposalId,
      taskId: params.taskId, decision: params.decision,
      mode: "external", target: "webhook",
      payload: buildOptimizationExecutionPayload(params.proposalContext, params.decision, meta),
    };
  }
  // ── Internal no-op: strategy / research / analytics / etc. ───────────────
  return {
    companyId:  params.companyId,
    proposalId: params.proposalId,
    taskId:     params.taskId,
    decision:   params.decision,
    mode:       "internal",
    target:     "internal",
    payload: {
      proposalType:    params.proposalType,
      proposalContext: params.proposalContext,
    },
  };
}

// ─── Main Orchestrated Deliberation ──────────────────────────────────────────
export async function runOrchestratedDeliberation(params: {
  proposalId: number;
  companyId: number;
  proposalType: string;
  proposalContext: string;
  budget?: number;
  executionMetadata?: Record<string, unknown>;
}): Promise<OrchestratedDeliberationResult> {
  const { proposalId, companyId, proposalType, proposalContext, budget, executionMetadata } = params;

  // ── System Guards (pre-flight) ────────────────────────────────────────────
  // 1a. Duplicate run guard — block if this proposal already has a brain_run ledger entry
  const duplicateCheck = await preventDuplicateExecution({
    companyId,
    taskId: `proposal_${proposalId}`,
  });
  if (!duplicateCheck.allowed) {
    return {
      proposalId, companyId,
      deliberationId: 0, rounds: [], selectedAgents: [],
      weightedConsensusScore: 0, dissentSummary: [],
      finalRecommendation: "", finalRecommendationAr: "",
      decisionTrace: { routing: { reason: "", agentsSelected: [], agentsExcluded: [] }, rounds: [], finalDecision: { chosenOption: "", reason: "", confidence: 0, dissents: 0 } },
      escalated: false, summary: "", summaryAr: "",
      brainRun: { task: { id: "", companyId, proposalId, type: "strategy", action: "recommend", title: "", description: "", input: {}, stage: "intake", createdAt: new Date().toISOString() }, memoryWrites: [] },
      guardBlocked: { guard: "preventDuplicateExecution", reason: duplicateCheck.reason! },
    };
  }

  // 1b. Concurrency guard — block if company already has too many active runs
  const slotCheck = acquireRunSlot(companyId);
  if (!slotCheck.allowed) {
    return {
      proposalId, companyId,
      deliberationId: 0, rounds: [], selectedAgents: [],
      weightedConsensusScore: 0, dissentSummary: [],
      finalRecommendation: "", finalRecommendationAr: "",
      decisionTrace: { routing: { reason: "", agentsSelected: [], agentsExcluded: [] }, rounds: [], finalDecision: { chosenOption: "", reason: "", confidence: 0, dissents: 0 } },
      escalated: false, summary: "", summaryAr: "",
      brainRun: { task: { id: "", companyId, proposalId, type: "strategy", action: "recommend", title: "", description: "", input: {}, stage: "intake", createdAt: new Date().toISOString() }, memoryWrites: [] },
      guardBlocked: { guard: "acquireRunSlot", reason: slotCheck.reason! },
    };
  }

  // Slot acquired — wrap the rest in try/finally to always release it
  try {

  // 1. Build rich company context
  const [intelligenceCtx, knowledgeCtx] = await Promise.all([
    buildIntelligenceContext(companyId),
    buildCompanyContext(companyId),
  ]);
  const companyContext = `${knowledgeCtx}\n\n${intelligenceCtx}`;

  // 1b. Build orchestration task envelope
  const task = makeTask({ companyId, proposalId, proposalType, proposalContext });

  // 1c. Retrieve hybrid memory context (ranked from prior decisions/learnings/executions)
  const hybridMemory = await buildHybridMemoryContext({ companyId, task });

  // 1d. Build evidence array (company context + hybrid memory)
  const evidence: BrainEvidence[] = [
    ...buildEvidence(companyContext),
    {
      source: "memory" as const,
      key: "hybrid_memory_context",
      summary: "Hybrid memory context assembled from ranked structured memory",
      payload: hybridMemory.topMemories,
    },
  ];

  // 1e. Enrich proposal context with relevant memory before deliberation
  const enrichedProposalContext = hybridMemory.assembledContext.length > 0
    ? [proposalContext, "", "Hybrid Memory Context:", hybridMemory.assembledContext].join("\n")
    : proposalContext;

  // 2. Select agents via canonical routing
  const taskType = normalizeTaskType(proposalType);
  const selected = selectAgents(proposalType, budget);
  const taskScopedAgents = getCanonicalAgentsByTask(taskType);
  const excluded = taskScopedAgents.filter(
    a => !selected.find(s => s.agent.id === a.id),
  );
  const routingTrace = {
    reason: `Task type "${taskType}" (from "${proposalType}"), budget ${budget ?? "unspecified"}. Selected ${selected.length} canonical agents above weight threshold.`,
    agentsSelected: selected.map(s => `${s.agent.name} [${s.agent.id}] (w:${s.weight.toFixed(2)})`),
    agentsExcluded: excluded.map(e => `${e.name} [${e.id}]`),
  };

  // 3. Create deliberation record
  const deliberationRecord = await createDeliberation({ proposalId, companyId });
  if (!deliberationRecord) throw new Error("Failed to create deliberation");
  const deliberation = deliberationRecord;

  // 4. Run rounds
  const ROUNDS: DeliberationRound[] = ["proposal", "critique", "revision", "scoring"];
  const allRounds: { round: DeliberationRound; opinions: OrchestratedOpinion[] }[] = [];
  const roundTraces: { round: string; keyInsights: string[]; consensusShift: number }[] = [];
  let previousSummary = "";
  let prevConsensus = 0;

  for (const round of ROUNDS) {
    // Loop guard — hard cap on iterations (safety net against runaway loops)
    const loopCheck = preventInfiniteLoop({ iterationCount: allRounds.length });
    if (!loopCheck.allowed) {
      console.warn(`[orchestrator] ${loopCheck.reason} — stopping deliberation early`);
      break;
    }

    const opinions = await Promise.all(
      selected.map(({ agent, weight }) =>
        getOpinion(agent, weight, round, enrichedProposalContext, companyContext, previousSummary, taskType)
      )
    );

    // Mark dissenters (minority vote)
    const supporters = opinions.filter(o => o.votedFor).length;
    const majority = supporters >= opinions.length / 2;
    opinions.forEach(o => { o.dissent = majority ? !o.votedFor : o.votedFor; });

    // Weighted consensus for this round
    const totalWeight = selected.reduce((s, x) => s + x.weight, 0);
    const supportWeight = opinions.filter(o => o.votedFor).reduce((s, o) => s + o.weight, 0);
    const roundConsensus = totalWeight > 0 ? supportWeight / totalWeight : 0;

    roundTraces.push({
      round,
      keyInsights: opinions.slice(0, 3).map(o => `${o.agentName}: ${o.recommendation}`),
      consensusShift: roundConsensus - prevConsensus,
    });
    prevConsensus = roundConsensus;

    allRounds.push({ round, opinions });
    previousSummary = opinions
      .map(o => `${o.agentName} (w:${o.weight.toFixed(2)}): ${o.recommendation} | support:${o.votedFor} | confidence:${o.confidence.toFixed(2)}`)
      .join("\n");

    // Save opinions to DB
    for (const op of opinions) {
      await saveAgentOpinion({
        deliberationId: deliberation.id,
        companyId,
        agentRole: op.agentRole,
        agentName: op.agentName,
        round: allRounds.length,
        opinion: op.opinion,
        opinionAr: op.opinionAr,
        recommendation: op.recommendation,
        confidence: op.confidence,
        concerns: op.concerns,
        suggestions: op.suggestions,
        votedFor: op.votedFor,
      });
    }
  }

  // 5. Final synthesis
  const lastRound = allRounds[allRounds.length - 1].opinions;
  const totalWeight = selected.reduce((s, x) => s + x.weight, 0);
  const supportWeight = lastRound.filter(o => o.votedFor).reduce((s, o) => s + o.weight, 0);
  const weightedConsensusScore = totalWeight > 0 ? supportWeight / totalWeight : 0;

  // Escalation check
  const avgConfidence = lastRound.reduce((s, o) => s + o.confidence, 0) / lastRound.length;
  const dissenters = lastRound.filter(o => o.dissent);
  const highWeightDissenters = dissenters.filter(o => o.weight >= 0.8);
  const escalated = avgConfidence < 0.5 || weightedConsensusScore < 0.4 || highWeightDissenters.length >= 2;

  const dissentSummary: DissentSummary[] = dissenters.map(d => ({
    agentName: d.agentName,
    agentRole: d.agentRole,
    concern: d.concerns[0] ?? d.recommendation,
    weight: d.weight,
  }));

  // LLM final synthesis
  let finalRecommendation = "Proceed with the proposal based on weighted agent consensus.";
  let finalRecommendationAr = "المضي قدماً في المقترح بناءً على إجماع الوكلاء الموزون.";
  let summary = `Weighted consensus: ${(weightedConsensusScore * 100).toFixed(0)}% across ${selected.length} agents.`;
  let summaryAr = `إجماع موزون: ${(weightedConsensusScore * 100).toFixed(0)}٪ عبر ${selected.length} وكيل.`;

  try {
    const synthRes = await invokeLLM({
      messages: [
        { role: "system", content: "You are the Chief Decision Synthesizer. Produce a final orchestrated recommendation." },
        { role: "user", content: `Based on ${ROUNDS.length} deliberation rounds with ${selected.length} weighted agents:\n\nFinal round summary:\n${previousSummary}\n\nWeighted consensus: ${(weightedConsensusScore * 100).toFixed(0)}%\nEscalated: ${escalated}\n\nProvide JSON:\n{\n  "finalRecommendation": "...",\n  "finalRecommendationAr": "...",\n  "summary": "...",\n  "summaryAr": "..."\n}` },
      ],
    });
    const sc = (synthRes.choices?.[0]?.message?.content ?? "") as string;
    const sp = JSON.parse(sc.replace(/```json\n?|\n?```/g, "").trim());
    finalRecommendation = sp.finalRecommendation ?? finalRecommendation;
    finalRecommendationAr = sp.finalRecommendationAr ?? finalRecommendationAr;
    summary = sp.summary ?? summary;
    summaryAr = sp.summaryAr ?? summaryAr;
  } catch { /* use defaults */ }

  // 6. Update deliberation record
  await updateDeliberation(deliberation.id, {
    status: (weightedConsensusScore >= 0.6 && !escalated ? "completed" : "failed") as "in_progress" | "completed" | "failed",
    consensusScore: weightedConsensusScore,
    finalRecommendation,
    finalRecommendationAr,
    summary,
    summaryAr,
    totalRounds: allRounds.length,
  });

  const decisionTrace: DecisionTrace = {
    routing: routingTrace,
    rounds: roundTraces,
    finalDecision: {
      chosenOption: weightedConsensusScore >= 0.6 ? "Proceed" : "Revise",
      reason: finalRecommendation,
      confidence: avgConfidence,
      dissents: dissenters.length,
    },
  };

  // ─── Build canonical BrainRunResult ────────────────────────────────────────
  // Use structured risk score from agent envelope when available;
  // fall back to derived (1 - confidence) when not.
  const averageRisk =
    lastRound.length > 0
      ? lastRound.reduce((sum, op) => {
          const structuredRisk = typeof op.risk === "number" ? op.risk : null;
          const derivedRisk = Math.max(0, 1 - op.confidence) + (op.dissent ? 0.25 : 0);
          return sum + Math.min(1, structuredRisk ?? derivedRisk);
        }, 0) / lastRound.length
      : 0.5;

  const deliberationBundle: DeliberationBundle = {
    task,
    round: "final",
    assessments: lastRound.map(op => ({
      agentId:        op.agentRole,
      agentRole:      op.agentRole,
      opinion:        op.opinion,
      recommendation: op.recommendation,
      confidence:     op.confidence,
      // Prefer structured risk from envelope; fall back to derived value
      riskScore: typeof op.risk === "number"
        ? Math.min(1, Math.max(0, op.risk))
        : Math.min(1, Math.max(0, 1 - op.confidence)),
      votedFor:       op.votedFor,
      concerns:       op.concerns,
      suggestions:    op.suggestions,
      evidence: op.routing
        ? [
            {
              source: "system" as const,
              key: "model_routing",
              summary: `Provider: ${op.routing.provider} | Reasons: ${op.routing.reasons.join(", ")} | Policy: v${op.routing.policyVersion}`,
              payload: op.routing,
            },
          ]
        : [],
    })),
    weightedConsensus: weightedConsensusScore,
    averageConfidence: avgConfidence,
    averageRisk,
    dissentCount: dissenters.length,
  };

  // ── Autonomy Policy ─────────────────────────────────────────────────────────
  const autonomy = decideAutonomy({
    task,
    confidence: avgConfidence,
    riskScore:  averageRisk,
  });

  const brainDecision: BrainDecision = {
    companyId,
    proposalId,
    taskId: task.id,
    status: escalated ? "needs_revision" : (autonomy.requiresHumanApproval ? "pending_approval" : "approved"),
    recommendation: finalRecommendation,
    reason: `${summary}\nAutonomy: ${autonomy.level} — ${autonomy.reasoning}`,
    confidence: avgConfidence,
    riskScore: averageRisk,
    requiresHumanApproval: autonomy.requiresHumanApproval,
    executionAllowed: autonomy.executionAllowed,
    selectedAgents: selected.map(s => s.agent.id),
    dissentSummary: dissentSummary.map(d => `${d.agentName}: ${d.concern}`),
    evidence,
    createdAt: nowIso(),
  };

  // Collect routing stats across all final-round opinions
  const routingStats = lastRound.reduce(
    (acc, op) => {
      if (op.routing) {
        acc.cloud += op.routing.provider === "cloud" ? 1 : 0;
        acc.local += op.routing.provider === "local" ? 1 : 0;
        op.routing.reasons.forEach(r => acc.reasons.add(r));
      }
      return acc;
    },
    { cloud: 0, local: 0, reasons: new Set<string>() },
  );

  const memoryWrites: MemoryWriteRequest[] = [
    {
      companyId,
      scope: "decision",
      key: `proposal_${proposalId}_decision_preview`,
      value: {
        taskId: task.id,
        recommendation: finalRecommendation,
        consensus: weightedConsensusScore,
        avgConfidence,
        averageRisk,
        escalated,
      },
      confidence: avgConfidence,
      source: "orchestrator",
    },
    {
      companyId,
      scope: "agent_interaction",
      key: `proposal_${proposalId}_deliberation_summary`,
      value: {
        selectedAgents: selected.map(s => s.agent.id),
        dissentCount: dissenters.length,
        rounds: allRounds.length,
      },
      confidence: weightedConsensusScore,
      source: "orchestrator",
    },
    {
      companyId,
      scope: "agent_interaction",
      key: `proposal_${proposalId}_model_policy_trace`,
      value: lastRound.map(op => ({
        agentRole: op.agentRole,
        agentName: op.agentName,
        provider: op.routing?.provider ?? "unknown",
        reasons: op.routing?.reasons ?? [],
        policyVersion: op.routing?.policyVersion ?? "offline-first-v1",
      })),
      confidence: 1,
      source: "model_router",
    },
    {
      companyId,
      scope: "decision",
      key: `proposal_${proposalId}_autonomy`,
      value: autonomy,
      confidence: 1,
      source: "autonomy_policy",
    },
  ];

  // ─── Execution Gate + Receipt ───────────────────────────────────────────────
  // brainDecision.executionAllowed is false by design (human-in-the-loop).
  // The gate will block execution and produce a "blocked" receipt — this is
  // the correct behaviour: every deliberation ends with a receipt, and the
  // receipt records *why* execution was not initiated.
  const executionRequest = buildExecutionRequest({
    companyId,
    proposalId,
    taskId: task.id,
    decision: brainDecision,
    proposalType,
    proposalContext,
    executionMetadata,
  });

  const gate = validateExecutionGate(brainDecision, executionRequest);

  // ── DEMO_MODE execution bypass ───────────────────────────────────────────
  // When DEMO_MODE=true, the gate is bypassed so the demo can run end-to-end
  // without human approval steps. Autonomy policy itself is unchanged —
  // this is the ONLY place demo execution override is applied.
  const demoBypass = process.env.DEMO_MODE === "true";

  let execution: ExecutionReceipt | undefined;
  let executionMemoryWrite: MemoryWriteRequest | undefined;

  if (!gate.allowed && !demoBypass) {
    execution = {
      executor: "execution_gate",
      status: "blocked",
      summary: gate.reason,
      payload: {
        proposalId,
        taskId: task.id,
        target: executionRequest.target,
        decisionStatus: brainDecision.status,
      },
      executedAt: nowIso(),
    };
    executionMemoryWrite = {
      companyId,
      scope: "execution",
      key: `task_${task.id}_receipt`,
      value: execution,
      confidence: 1,
      source: "execution_gate",
    };
  } else {
    const executed = await runExecutionWithReceipt(executionRequest);
    execution = executed.receipt;
    executionMemoryWrite = executed.memoryWrite;
    await persistExecutionReceipt({
      companyId,
      proposalId,
      taskId: task.id,
      decision: brainDecision,
      request: executionRequest,
      receipt: execution,
    });
  }

  const brainRun: BrainRunResult = {
    task,
    deliberation: deliberationBundle,
    decision: brainDecision,
    execution,
    memoryWrites: executionMemoryWrite
      ? [...memoryWrites, executionMemoryWrite]
      : memoryWrites,
  };

  // ─── Learning Extraction + Hybrid Memory Persist ────────────────────────────
  const learningWrites = extractLearningFromRun({
    task,
    decision: brainDecision,
    execution,
  });
  const finalMemoryWrites = [...brainRun.memoryWrites, ...learningWrites];
  await writeHybridMemories(finalMemoryWrites);

  // ─── Decision Ledger snapshot ────────────────────────────────────────────────
  // Persists a single atomic row with full run context for audit + replayability.
  // Non-fatal — failure is logged but does not abort the return value.
  await persistBrainRunLedger(brainRun);

  return {
    proposalId, companyId,
    deliberationId: deliberation.id,
    rounds: allRounds,
    selectedAgents: selected.map(s => ({ role: s.agent.id, name: s.agent.name, weight: s.weight })),
    weightedConsensusScore,
    dissentSummary,
    finalRecommendation,
    finalRecommendationAr,
    decisionTrace,
    escalated,
    escalationReason: escalated ? `Low confidence (${(avgConfidence * 100).toFixed(0)}%) or high dissent from key agents` : undefined,
    summary,
    summaryAr,
    brainRun,
  };

  } finally {
    // Always release the concurrency slot, even if the run threw
    releaseRunSlot(companyId);
  }
}
