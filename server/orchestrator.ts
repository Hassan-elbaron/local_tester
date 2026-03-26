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
  BrainRunResult,
  BrainTaskType,
  DeliberationBundle,
  MemoryWriteRequest,
} from "./orchestration_contract";

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

// ─── Single Agent Opinion (one round) ────────────────────────────────────────
async function getOpinion(
  agent: CanonicalAgent,
  weight: number,
  round: DeliberationRound,
  proposalContext: string,
  companyContext: string,
  previousSummary: string,
): Promise<OrchestratedOpinion> {
  const roundInstructions: Record<DeliberationRound, string> = {
    proposal: "Provide your initial professional assessment of this proposal.",
    critique: "Critically evaluate the proposal. Focus on risks, gaps, and weaknesses. Be direct.",
    revision: "Based on the critique round, suggest specific improvements and revised approach.",
    scoring: "Score this proposal on: feasibility (0-10), impact (0-10), risk (0-10 where 10=high risk), alignment (0-10). Provide final vote.",
    final: "Give your final weighted recommendation considering all previous rounds.",
  };

  const prompt = `COMPANY CONTEXT:\n${companyContext}\n\nPROPOSAL:\n${proposalContext}\n\n${previousSummary ? `PREVIOUS ROUND SUMMARY:\n${previousSummary}\n\n` : ""}ROUND: ${round.toUpperCase()}\nINSTRUCTION: ${roundInstructions[round]}\n\nYour domain weight for this decision type: ${weight.toFixed(2)} (higher = more relevant expertise)\n\nRespond ONLY with valid JSON:\n{\n  "opinion": "2-3 paragraph professional assessment",\n  "recommendation": "One clear sentence",\n  "confidence": 0.85,\n  "concerns": ["concern 1", "concern 2"],\n  "suggestions": ["suggestion 1", "suggestion 2"],\n  "votedFor": true,\n  "dissent_reason": "Only if votedFor=false: explain your dissent clearly"\n}`;

  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: agent.systemPrompt },
        { role: "user", content: prompt },
      ],
    });
    const content = (res.choices?.[0]?.message?.content ?? "") as string;
    const clean = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      agentRole: agent.id,
      agentName: agent.name,
      opinion: parsed.opinion ?? "",
      opinionAr: "",
      recommendation: parsed.recommendation ?? "",
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.7)),
      concerns: parsed.concerns ?? [],
      suggestions: parsed.suggestions ?? [],
      votedFor: parsed.votedFor ?? true,
      weight,
      weightedScore: (parsed.votedFor ? 1 : 0) * weight,
      round,
      dissent: false, // set after all opinions collected
    };
  } catch {
    return {
      agentRole: agent.id, agentName: agent.name,
      opinion: "Unable to generate opinion at this time.",
      opinionAr: "", recommendation: "Proceed with caution.",
      confidence: 0.5, concerns: [], suggestions: [],
      votedFor: true, weight, weightedScore: weight * 0.5,
      round, dissent: false,
    };
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

// ─── Main Orchestrated Deliberation ──────────────────────────────────────────
export async function runOrchestratedDeliberation(params: {
  proposalId: number;
  companyId: number;
  proposalType: string;
  proposalContext: string;
  budget?: number;
}): Promise<OrchestratedDeliberationResult> {
  const { proposalId, companyId, proposalType, proposalContext, budget } = params;

  // 1. Build rich company context
  const [intelligenceCtx, knowledgeCtx] = await Promise.all([
    buildIntelligenceContext(companyId),
    buildCompanyContext(companyId),
  ]);
  const companyContext = `${knowledgeCtx}\n\n${intelligenceCtx}`;

  // 1b. Build orchestration task envelope + evidence
  const task = makeTask({ companyId, proposalId, proposalType, proposalContext });
  const evidence = buildEvidence(companyContext);

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
    const opinions = await Promise.all(
      selected.map(({ agent, weight }) =>
        getOpinion(agent, weight, round, proposalContext, companyContext, previousSummary)
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
  const averageRisk =
    lastRound.length > 0
      ? lastRound.reduce((sum, op) => {
          const localRisk = Math.max(0, 1 - op.confidence) + (op.dissent ? 0.25 : 0);
          return sum + Math.min(1, localRisk);
        }, 0) / lastRound.length
      : 0.5;

  const deliberationBundle: DeliberationBundle = {
    task,
    round: "final",
    assessments: lastRound.map(op => ({
      agentId: op.agentRole,
      agentRole: op.agentRole,
      opinion: op.opinion,
      recommendation: op.recommendation,
      confidence: op.confidence,
      riskScore: Math.min(1, Math.max(0, 1 - op.confidence)),
      votedFor: op.votedFor,
      concerns: op.concerns,
      suggestions: op.suggestions,
      evidence: [],
    })),
    weightedConsensus: weightedConsensusScore,
    averageConfidence: avgConfidence,
    averageRisk,
    dissentCount: dissenters.length,
  };

  const brainDecision: BrainDecision = {
    companyId,
    proposalId,
    taskId: task.id,
    status: escalated ? "needs_revision" : "pending_approval",
    recommendation: finalRecommendation,
    reason: summary,
    confidence: avgConfidence,
    riskScore: averageRisk,
    requiresHumanApproval: true,
    executionAllowed: false,
    selectedAgents: selected.map(s => s.agent.id),
    dissentSummary: dissentSummary.map(d => `${d.agentName}: ${d.concern}`),
    evidence,
    createdAt: nowIso(),
  };

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
  ];

  const brainRun: BrainRunResult = {
    task,
    deliberation: deliberationBundle,
    decision: brainDecision,
    memoryWrites,
  };

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
}
