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
import { AGENTS, AgentConfig, AgentOpinionResult } from "./agents";
import { getCompanyMemory, createDeliberation, saveAgentOpinion, updateDeliberation } from "./db";
import { buildIntelligenceContext } from "./intelligence";
import { buildCompanyContext } from "./knowledge";

// ─── Agent Domain Weights ─────────────────────────────────────────────────────
// Weight 0-1: how relevant this agent is per proposal type
const AGENT_DOMAIN_WEIGHTS: Record<string, Record<string, number>> = {
  paid_media:  { cmo:0.9, paid_media_director:1.0, performance_lead:0.9, creative_director:0.7, copy_chief:0.6, content_strategist:0.5, funnel_architect:0.8, crm_expert:0.5, seo_strategist:0.4, analytics_lead:0.9, brand_strategist:0.6, market_researcher:0.7, budget_controller:0.9 },
  content:     { cmo:0.8, paid_media_director:0.4, performance_lead:0.5, creative_director:1.0, copy_chief:1.0, content_strategist:1.0, funnel_architect:0.6, crm_expert:0.5, seo_strategist:0.8, analytics_lead:0.6, brand_strategist:0.8, market_researcher:0.7, budget_controller:0.5 },
  seo:         { cmo:0.7, paid_media_director:0.4, performance_lead:0.6, creative_director:0.5, copy_chief:0.7, content_strategist:0.8, funnel_architect:0.7, crm_expert:0.4, seo_strategist:1.0, analytics_lead:0.8, brand_strategist:0.5, market_researcher:0.7, budget_controller:0.5 },
  crm:         { cmo:0.8, paid_media_director:0.4, performance_lead:0.6, creative_director:0.4, copy_chief:0.6, content_strategist:0.5, funnel_architect:0.9, crm_expert:1.0, seo_strategist:0.3, analytics_lead:0.8, brand_strategist:0.5, market_researcher:0.7, budget_controller:0.6 },
  strategy:    { cmo:1.0, paid_media_director:0.7, performance_lead:0.7, creative_director:0.6, copy_chief:0.5, content_strategist:0.6, funnel_architect:0.7, crm_expert:0.6, seo_strategist:0.5, analytics_lead:0.8, brand_strategist:0.9, market_researcher:0.9, budget_controller:0.8 },
  budget:      { cmo:0.9, paid_media_director:0.8, performance_lead:0.8, creative_director:0.4, copy_chief:0.3, content_strategist:0.4, funnel_architect:0.6, crm_expert:0.5, seo_strategist:0.4, analytics_lead:0.9, brand_strategist:0.5, market_researcher:0.6, budget_controller:1.0 },
  campaign:    { cmo:0.9, paid_media_director:0.9, performance_lead:0.9, creative_director:0.9, copy_chief:0.8, content_strategist:0.8, funnel_architect:0.8, crm_expert:0.6, seo_strategist:0.6, analytics_lead:0.8, brand_strategist:0.8, market_researcher:0.7, budget_controller:0.8 },
  funnel:      { cmo:0.8, paid_media_director:0.7, performance_lead:0.8, creative_director:0.6, copy_chief:0.7, content_strategist:0.7, funnel_architect:1.0, crm_expert:0.9, seo_strategist:0.6, analytics_lead:0.8, brand_strategist:0.5, market_researcher:0.6, budget_controller:0.6 },
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
}

export interface DecisionTrace {
  routing: { reason: string; agentsSelected: string[]; agentsExcluded: string[] };
  rounds: { round: string; keyInsights: string[]; consensusShift: number }[];
  finalDecision: { chosenOption: string; reason: string; confidence: number; dissents: number };
}

// ─── Agent Selection (Contextual Routing) ────────────────────────────────────
function selectAgents(proposalType: string, budget?: number): { agent: AgentConfig; weight: number }[] {
  const weights = AGENT_DOMAIN_WEIGHTS[proposalType] ?? AGENT_DOMAIN_WEIGHTS.strategy;
  const threshold = budget && budget > 100000 ? 0.5 : 0.65; // high-budget = more agents
  return AGENTS
    .map(a => ({ agent: a, weight: weights[a.role] ?? 0.5 }))
    .filter(x => x.weight >= threshold)
    .sort((a, b) => b.weight - a.weight);
}

// ─── Single Agent Opinion (one round) ────────────────────────────────────────
async function getOpinion(
  agent: AgentConfig,
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
      agentRole: agent.role,
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
      agentRole: agent.role, agentName: agent.name,
      opinion: "Unable to generate opinion at this time.",
      opinionAr: "", recommendation: "Proceed with caution.",
      confidence: 0.5, concerns: [], suggestions: [],
      votedFor: true, weight, weightedScore: weight * 0.5,
      round, dissent: false,
    };
  }
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

  // 2. Select agents contextually
  const selected = selectAgents(proposalType, budget);
  const excluded = AGENTS.filter(a => !selected.find(s => s.agent.role === a.role));
  const routingTrace = {
    reason: `Proposal type "${proposalType}" with budget ${budget ?? "unspecified"}. Selected ${selected.length} agents with weight ≥ threshold.`,
    agentsSelected: selected.map(s => `${s.agent.name} (w:${s.weight.toFixed(2)})`),
    agentsExcluded: excluded.map(e => e.name),
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

  return {
    proposalId, companyId,
    deliberationId: deliberation.id,
    rounds: allRounds,
    selectedAgents: selected.map(s => ({ role: s.agent.role, name: s.agent.name, weight: s.weight })),
    weightedConsensusScore,
    dissentSummary,
    finalRecommendation,
    finalRecommendationAr,
    decisionTrace,
    escalated,
    escalationReason: escalated ? `Low confidence (${(avgConfidence * 100).toFixed(0)}%) or high dissent from key agents` : undefined,
    summary,
    summaryAr,
  };
}
