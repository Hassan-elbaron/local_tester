/**
 * Deliberation Engine — Real Multi-Agent Collaborative Decision Making
 *
 * Process:
 *  1. Each agent independently analyzes the topic → First Pass
 *  2. All first-pass opinions are shared with all agents
 *  3. Each agent re-evaluates knowing others' views → Second Pass
 *  4. Aggregation layer collects votes
 *  5. Conflict resolution for opposing views
 *  6. Final decision object with confidence, alternatives, explanations
 *
 * All outputs saved to deliberation_sessions table.
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  deliberationSessions, decisions, companies, masterStrategy,
  personas, competitorProfiles, funnels,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// ─── Agent Registry ────────────────────────────────────────────────────────────

export const AGENT_REGISTRY = [
  {
    id: "business_understanding",
    name: "Business Understanding Agent",
    role: "Business Analyst",
    expertise: "Business model analysis, value proposition, market positioning, SWOT",
    weight: 1.2,
  },
  {
    id: "market_research",
    name: "Market Research Agent",
    role: "Market Research Analyst",
    expertise: "Market sizing, trends, customer segments, demand analysis",
    weight: 1.1,
  },
  {
    id: "competitor_intelligence",
    name: "Competitor Intelligence Agent",
    role: "Competitive Intelligence Specialist",
    expertise: "Competitor analysis, positioning gaps, threat assessment, differentiation",
    weight: 1.1,
  },
  {
    id: "persona",
    name: "Persona & Audience Agent",
    role: "Audience Intelligence Specialist",
    expertise: "Customer personas, psychographics, buying behavior, pain points",
    weight: 1.0,
  },
  {
    id: "strategy",
    name: "Chief Strategy Agent",
    role: "Chief Marketing Strategist",
    expertise: "Marketing strategy, go-to-market, positioning, brand strategy",
    weight: 1.5,  // higher weight — synthesis role
  },
  {
    id: "funnel_architect",
    name: "Funnel Architect Agent",
    role: "Conversion Funnel Architect",
    expertise: "Funnel design, conversion optimization, customer journey mapping",
    weight: 1.0,
  },
  {
    id: "brand_messaging",
    name: "Brand Messaging Agent",
    role: "Brand Voice & Messaging Specialist",
    expertise: "Brand voice, messaging frameworks, tone of voice, copywriting direction",
    weight: 1.0,
  },
  {
    id: "seo_strategy",
    name: "SEO Strategy Agent",
    role: "SEO Strategist",
    expertise: "Technical SEO, keyword strategy, content gaps, search visibility",
    weight: 0.9,
  },
  {
    id: "paid_strategy",
    name: "Paid Media Strategy Agent",
    role: "Paid Media Director",
    expertise: "Paid advertising, channel strategy, budget allocation, ROAS optimization",
    weight: 1.1,
  },
  {
    id: "content_strategy",
    name: "Content Strategy Agent",
    role: "Content Strategist",
    expertise: "Content planning, editorial calendar, format strategy, distribution",
    weight: 1.0,
  },
  {
    id: "ux_ui",
    name: "UX/UI Agent",
    role: "UX/UI Specialist",
    expertise: "User experience, conversion friction, landing page optimization, design",
    weight: 0.9,
  },
  {
    id: "analytics",
    name: "Analytics Agent",
    role: "Analytics & Data Specialist",
    expertise: "KPI tracking, data analysis, attribution, reporting frameworks",
    weight: 1.0,
  },
  {
    id: "budget",
    name: "Budget Controller Agent",
    role: "Budget & Finance Controller",
    expertise: "Budget allocation, ROI projection, financial modeling, risk assessment",
    weight: 1.0,
  },
  {
    id: "automation",
    name: "Automation & CRM Agent",
    role: "Marketing Automation Specialist",
    expertise: "Email sequences, CRM workflows, lead nurturing, automation triggers",
    weight: 0.9,
  },
  {
    id: "community_reputation",
    name: "Community & Reputation Agent",
    role: "Brand & Community Manager",
    expertise: "Social listening, reputation management, community building, brand mentions",
    weight: 0.9,
  },
] as const;

export type AgentId = typeof AGENT_REGISTRY[number]["id"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

function llmText(r: any): string {
  const c = r?.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : JSON.stringify(c ?? "");
}

function parseJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw); } catch { return fallback; }
}

// ─── Build Context for Deliberation ───────────────────────────────────────────

async function buildDeliberationContext(companyId: number): Promise<string> {
  const db = await D();
  const [co] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const [strat] = await db.select().from(masterStrategy)
    .where(eq(masterStrategy.companyId, companyId)).orderBy(desc(masterStrategy.version)).limit(1);
  const ps = await db.select().from(personas)
    .where(and(eq(personas.companyId, companyId), eq(personas.status, "approved")));
  const comps = await db.select().from(competitorProfiles)
    .where(and(eq(competitorProfiles.companyId, companyId), eq(competitorProfiles.status, "confirmed")));

  return `
COMPANY: ${co?.name ?? "Unknown"} | Industry: ${co?.industry ?? "Unknown"}
DESCRIPTION: ${co?.description ?? "Not provided"}
STRATEGY STATUS: ${strat?.status ?? "none"} | Positioning: ${strat?.positioning ?? "not set"}
BRAND MESSAGE: ${strat?.brandMessage ?? "not set"}
TONE: ${strat?.toneOfVoice ?? "not set"}
PERSONAS: ${ps.map(p => p.name).join(", ") || "none yet"}
KEY PERSONA PAINS: ${ps.flatMap(p => (p.painPoints as string[] ?? []).slice(0, 2)).join("; ") || "unknown"}
CONFIRMED COMPETITORS: ${comps.map(c => c.name).join(", ") || "none confirmed"}
`.trim();
}

// ─── Phase 1: First Pass — Independent Opinions ───────────────────────────────

async function runFirstPass(
  topic: string,
  topicContext: string,
  companyContext: string,
  agentIds: AgentId[]
): Promise<Array<{
  agentId: string; agentName: string; role: string;
  opinion: string; recommendation: string; confidence: number;
  concerns: string[]; dataPoints: string[];
}>> {
  const agents = AGENT_REGISTRY.filter(a => agentIds.includes(a.id as AgentId));

  const results = await Promise.all(agents.map(async (agent) => {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the ${agent.name}. Your role: ${agent.role}. Your expertise: ${agent.expertise}.
You are participating in a marketing strategy deliberation. Give your INDEPENDENT analysis without being influenced by others.
Respond with valid JSON only.`,
        },
        {
          role: "user",
          content: `DELIBERATION TOPIC: ${topic}

COMPANY CONTEXT:
${companyContext}

TOPIC CONTEXT:
${topicContext}

As ${agent.role}, provide your independent assessment. Be specific, data-driven, and direct.
Consider only your area of expertise: ${agent.expertise}.

JSON:
{
  "opinion": "2-3 sentence assessment from your expert perspective",
  "recommendation": "Your specific recommendation on this topic",
  "confidence": 0.0-1.0,
  "concerns": ["concern 1 from your perspective", "concern 2"],
  "dataPoints": ["supporting fact or reasoning 1", "supporting fact 2"],
  "keyRisk": "biggest risk you see",
  "keyOpportunity": "biggest opportunity you see"
}
Return ONLY JSON.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = parseJSON<any>(llmText(result), {});
    return {
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role,
      opinion: parsed.opinion ?? "",
      recommendation: parsed.recommendation ?? "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      concerns: parsed.concerns ?? [],
      dataPoints: parsed.dataPoints ?? [],
    };
  }));

  return results;
}

// ─── Phase 2: Second Pass — Cross-Informed Re-evaluation ─────────────────────

async function runSecondPass(
  topic: string,
  companyContext: string,
  firstPassOpinions: Array<{ agentId: string; agentName: string; role: string; opinion: string; recommendation: string; confidence: number; concerns: string[] }>,
  agentIds: AgentId[]
): Promise<Array<{
  agentId: string; agentName: string;
  updatedOpinion: string; changed: boolean; changeReason?: string;
  finalVote: "support" | "oppose" | "abstain"; confidence: number;
}>> {
  const agents = AGENT_REGISTRY.filter(a => agentIds.includes(a.id as AgentId));

  // Summarize all first-pass opinions for sharing
  const opinionSummary = firstPassOpinions.map(o =>
    `[${o.agentName}] Recommendation: "${o.recommendation}" | Confidence: ${(o.confidence * 100).toFixed(0)}% | Key concerns: ${o.concerns.slice(0, 2).join("; ")}`
  ).join("\n");

  const results = await Promise.all(agents.map(async (agent) => {
    const myFirstPass = firstPassOpinions.find(o => o.agentId === agent.id);

    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the ${agent.name}. You have just seen the opinions of all other agents on the same topic.
Now re-evaluate your position considering the collective intelligence. You may change your view if others raise valid points.
Respond with valid JSON only.`,
        },
        {
          role: "user",
          content: `TOPIC: ${topic}

YOUR FIRST OPINION: "${myFirstPass?.recommendation ?? "You did not participate in first pass"}"
YOUR INITIAL CONFIDENCE: ${((myFirstPass?.confidence ?? 0.7) * 100).toFixed(0)}%

ALL AGENT OPINIONS (Round 1):
${opinionSummary}

After seeing all perspectives, re-evaluate your position.
Consider: Are there valid concerns you missed? Does collective wisdom change your view?

JSON:
{
  "updatedOpinion": "Your updated 2-sentence assessment",
  "changed": true/false,
  "changeReason": "Why you changed (or null if unchanged)",
  "finalVote": "support|oppose|abstain",
  "voteReason": "Why you are voting this way",
  "confidence": 0.0-1.0,
  "remainingConcerns": ["concern 1 you still have"]
}
Return ONLY JSON.`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = parseJSON<any>(llmText(result), {});
    return {
      agentId: agent.id,
      agentName: agent.name,
      updatedOpinion: parsed.updatedOpinion ?? "",
      changed: parsed.changed === true,
      changeReason: parsed.changeReason ?? undefined,
      finalVote: (["support", "oppose", "abstain"].includes(parsed.finalVote) ? parsed.finalVote : "support") as "support" | "oppose" | "abstain",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
    };
  }));

  return results;
}

// ─── Phase 3: Aggregation + Conflict Resolution ───────────────────────────────

async function aggregateAndResolve(
  topic: string,
  topicContext: string,
  companyContext: string,
  firstPass: Awaited<ReturnType<typeof runFirstPass>>,
  secondPass: Awaited<ReturnType<typeof runSecondPass>>
): Promise<{
  finalDecision: string;
  alternatives: Array<{ option: string; supportedBy: string[]; tradeoffs: string }>;
  agreements: string[];
  disagreements: string[];
  conflictsResolved: Array<{ conflict: string; resolution: string }>;
  confidenceScore: number;
  consensusReached: boolean;
}> {
  const supporting = secondPass.filter(a => a.finalVote === "support").length;
  const opposing = secondPass.filter(a => a.finalVote === "oppose").length;
  const abstaining = secondPass.filter(a => a.finalVote === "abstain").length;
  const totalVoting = supporting + opposing;

  const weightedConfidence = secondPass.reduce((sum, a) => {
    const agent = AGENT_REGISTRY.find(r => r.id === a.agentId);
    return sum + (a.confidence * (agent?.weight ?? 1.0));
  }, 0) / secondPass.length;

  const consensusReached = totalVoting > 0 && (supporting / totalVoting) >= 0.6;

  // Build synthesis context
  const firstPassSummary = firstPass.map(o =>
    `${o.agentName}: "${o.recommendation}" (confidence: ${(o.confidence * 100).toFixed(0)}%)\n  Concerns: ${o.concerns.join(", ")}`
  ).join("\n\n");

  const secondPassSummary = secondPass.map(o =>
    `${o.agentName}: Vote=${o.finalVote}, ${o.changed ? `CHANGED (${o.changeReason})` : "UNCHANGED"}, confidence=${(o.confidence * 100).toFixed(0)}%`
  ).join("\n");

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are the Chief Strategy Officer synthesizing a multi-agent deliberation. Produce a clear, actionable final decision. Respond with valid JSON only.",
      },
      {
        role: "user",
        content: `DELIBERATION TOPIC: ${topic}
TOPIC CONTEXT: ${topicContext}

VOTE SUMMARY: ${supporting} support, ${opposing} oppose, ${abstaining} abstain

ROUND 1 OPINIONS:
${firstPassSummary}

ROUND 2 VOTES & CHANGES:
${secondPassSummary}

Synthesize into a final decision:
1. Identify points of agreement
2. Identify points of disagreement
3. Resolve conflicts with clear reasoning
4. State the final decision
5. List viable alternatives considered but not chosen

JSON:
{
  "finalDecision": "Clear, specific final decision statement",
  "finalRationale": "2-3 sentences explaining why this is the right decision",
  "agreements": ["What all/most agents agreed on", "..."],
  "disagreements": ["Specific disagreement 1", "..."],
  "conflictsResolved": [
    {"conflict": "Description of the conflict", "resolution": "How it was resolved"}
  ],
  "alternatives": [
    {"option": "Alternative option", "supportedBy": ["Agent1"], "tradeoffs": "Key tradeoff"}
  ],
  "keyRisks": ["risk 1", "risk 2"],
  "keyConditions": ["Condition for success 1", "condition 2"]
}
Return ONLY JSON.`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = parseJSON<any>(llmText(result), {});

  return {
    finalDecision: `${parsed.finalDecision ?? ""}\n\nRationale: ${parsed.finalRationale ?? ""}`,
    alternatives: parsed.alternatives ?? [],
    agreements: parsed.agreements ?? [],
    disagreements: parsed.disagreements ?? [],
    conflictsResolved: parsed.conflictsResolved ?? [],
    confidenceScore: Math.min(Math.max(weightedConfidence, 0), 1),
    consensusReached,
  };
}

// ─── Main: Run Full Deliberation ──────────────────────────────────────────────

export async function runDeliberation(
  companyId: number,
  topic: string,
  topicContext: string,
  topicType: "strategy" | "campaign" | "funnel" | "content" | "budget" | "channel" | "creative" | "persona" | "seo" | "general" = "strategy",
  agentIds?: AgentId[]
): Promise<{
  sessionId: number;
  finalDecision: string;
  alternatives: Array<{ option: string; supportedBy: string[]; tradeoffs: string }>;
  agreements: string[];
  disagreements: string[];
  confidenceScore: number;
  consensusReached: boolean;
  supportingAgents: number;
  opposingAgents: number;
  totalAgents: number;
}> {
  const db = await D();
  const companyContext = await buildDeliberationContext(companyId);

  // Select agents — default to all 15, or specific subset
  const selectedAgentIds: AgentId[] = agentIds ?? AGENT_REGISTRY.map(a => a.id as AgentId);
  const selectedAgents = AGENT_REGISTRY.filter(a => selectedAgentIds.includes(a.id as AgentId));

  // Create session record
  const insertResult = await db.insert(deliberationSessions).values({
    companyId,
    topic,
    topicType,
    contextData: { companyContext, topicContext },
    status: "running",
    totalAgents: selectedAgents.length,
  } as any);
  const sessionId = Number((insertResult as any)[0]?.insertId ?? (insertResult as any).insertId);

  try {
    // Phase 1: First pass — independent opinions
    const firstPassOpinions = await runFirstPass(topic, topicContext, companyContext, selectedAgentIds);

    await db.update(deliberationSessions)
      .set({ firstPassOpinions: firstPassOpinions as any })
      .where(eq(deliberationSessions.id, sessionId));

    // Phase 2: Second pass — cross-informed re-evaluation
    const secondPassOpinions = await runSecondPass(topic, companyContext, firstPassOpinions, selectedAgentIds);

    await db.update(deliberationSessions)
      .set({ secondPassOpinions: secondPassOpinions as any })
      .where(eq(deliberationSessions.id, sessionId));

    // Phase 3: Aggregate and resolve
    const aggregated = await aggregateAndResolve(
      topic, topicContext, companyContext, firstPassOpinions, secondPassOpinions
    );

    const supporting = secondPassOpinions.filter(a => a.finalVote === "support").length;
    const opposing = secondPassOpinions.filter(a => a.finalVote === "oppose").length;
    const abstaining = secondPassOpinions.filter(a => a.finalVote === "abstain").length;

    // Update session with final results
    await db.update(deliberationSessions).set({
      agreements: aggregated.agreements as any,
      disagreements: aggregated.disagreements as any,
      conflictsResolved: aggregated.conflictsResolved as any,
      finalDecision: aggregated.finalDecision,
      alternatives: aggregated.alternatives as any,
      confidenceScore: String(aggregated.confidenceScore.toFixed(2)) as any,
      consensusReached: aggregated.consensusReached,
      supportingAgents: supporting,
      opposingAgents: opposing,
      abstainAgents: abstaining,
      status: "awaiting_human",
      updatedAt: new Date(),
    } as any).where(eq(deliberationSessions.id, sessionId));

    // Create a structured Decision object
    await db.insert(decisions).values({
      companyId,
      decisionType: (topicType === "general" ? "strategy" : topicType) as any,
      recommendation: aggregated.finalDecision,
      reason: aggregated.agreements.join("; "),
      sourceAgents: selectedAgents.map(a => a.name) as any,
      confidence: String(aggregated.confidenceScore.toFixed(2)) as any,
      urgency: "medium",
      expectedImpact: [] as any,
      alternatives: aggregated.alternatives as any,
      supportingMetrics: { voteSummary: { supporting, opposing, abstaining } } as any,
      deliberationId: sessionId,
      status: "pending",
    } as any);

    return {
      sessionId,
      finalDecision: aggregated.finalDecision,
      alternatives: aggregated.alternatives,
      agreements: aggregated.agreements,
      disagreements: aggregated.disagreements,
      confidenceScore: aggregated.confidenceScore,
      consensusReached: aggregated.consensusReached,
      supportingAgents: supporting,
      opposingAgents: opposing,
      totalAgents: selectedAgents.length,
    };

  } catch (error: any) {
    await db.update(deliberationSessions)
      .set({ status: "failed", updatedAt: new Date() } as any)
      .where(eq(deliberationSessions.id, sessionId));
    throw error;
  }
}

// ─── Get Deliberation Session ─────────────────────────────────────────────────

export async function getDeliberationSession(sessionId: number) {
  const db = await D();
  const [session] = await db.select().from(deliberationSessions)
    .where(eq(deliberationSessions.id, sessionId)).limit(1);
  return session ?? null;
}

export async function getCompanyDeliberations(companyId: number) {
  const db = await D();
  return db.select().from(deliberationSessions)
    .where(eq(deliberationSessions.companyId, companyId))
    .orderBy(desc(deliberationSessions.createdAt));
}

export async function approveDeliberation(sessionId: number, notes?: string) {
  const db = await D();
  await db.update(deliberationSessions).set({
    humanReview: "approved",
    humanNotes: notes ?? null,
    updatedAt: new Date(),
  } as any).where(eq(deliberationSessions.id, sessionId));

  // Update linked decision
  await db.update(decisions).set({
    status: "approved",
    humanNotes: notes ?? null,
    approvedAt: new Date(),
    updatedAt: new Date(),
  } as any).where(eq(decisions.deliberationId, sessionId));
}

export async function reviseDeliberation(sessionId: number, notes: string) {
  const db = await D();
  await db.update(deliberationSessions).set({
    humanReview: "revised",
    humanNotes: notes,
    updatedAt: new Date(),
  } as any).where(eq(deliberationSessions.id, sessionId));
}

export async function rejectDeliberation(sessionId: number, reason: string) {
  const db = await D();
  await db.update(deliberationSessions).set({
    humanReview: "rejected",
    humanNotes: reason,
    updatedAt: new Date(),
  } as any).where(eq(deliberationSessions.id, sessionId));

  await db.update(decisions).set({
    status: "rejected",
    humanNotes: reason,
    rejectedAt: new Date(),
    updatedAt: new Date(),
  } as any).where(eq(decisions.deliberationId, sessionId));
}

export async function getCompanyDecisions(companyId: number) {
  const db = await D();
  return db.select().from(decisions)
    .where(eq(decisions.companyId, companyId))
    .orderBy(desc(decisions.createdAt));
}
