/**
 * Pipeline Module — Core Marketing Journey
 * Handles: business understanding, competitor discovery, persona generation, strategy generation
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  projectPipeline, competitorProfiles, personas, masterStrategy,
  companies, companyMemory,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { buildCompanyContext } from "./knowledge";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ─── Pipeline CRUD ────────────────────────────────────────────────────────────

export async function getPipeline(companyId: number) {
  const db = await D();
  const rows = await db.select().from(projectPipeline)
    .where(eq(projectPipeline.companyId, companyId))
    .orderBy(desc(projectPipeline.id))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertPipeline(companyId: number, data: Partial<typeof projectPipeline.$inferInsert>) {
  const db = await D();
  const existing = await getPipeline(companyId);
  if (existing) {
    await db.update(projectPipeline).set({ ...data, updatedAt: new Date() } as any)
      .where(eq(projectPipeline.id, existing.id));
    return getPipeline(companyId);
  }
  await db.insert(projectPipeline).values({ companyId, ...data } as any);
  return getPipeline(companyId);
}

const VALID_PIPELINE_STAGES = [
  "intake", "business_understanding", "competitor_discovery", "competitor_review",
  "audience_persona", "deliberation", "strategy_generation", "strategy_review",
  "strategy_approved", "execution_ready", "monitoring_active",
];

export async function advancePipelineStage(companyId: number, stage: string) {
  const existing = await getPipeline(companyId);
  const completed = [...(existing?.completedStages as string[] ?? [])];
  if (!completed.includes(stage)) completed.push(stage);
  const isValid = VALID_PIPELINE_STAGES.includes(stage);
  return upsertPipeline(companyId, {
    ...(isValid ? { currentStage: stage as any } : {}),
    completedStages: completed,
  });
}

// ─── Competitor Profiles CRUD ─────────────────────────────────────────────────

export async function getCompetitors(companyId: number) {
  const db = await D();
  return db.select().from(competitorProfiles)
    .where(eq(competitorProfiles.companyId, companyId))
    .orderBy(desc(competitorProfiles.createdAt));
}

export async function upsertCompetitor(companyId: number, data: {
  name: string; website?: string; status?: "discovered" | "confirmed" | "rejected";
  analysis?: Record<string, unknown>; strengths?: string[]; weaknesses?: string[];
  discoveredBy?: "system" | "user"; id?: number;
}) {
  const db = await D();
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(competitorProfiles).set({ ...rest, updatedAt: new Date() } as any)
      .where(and(eq(competitorProfiles.id, id), eq(competitorProfiles.companyId, companyId)));
    return;
  }
  await db.insert(competitorProfiles).values({ companyId, ...data } as any);
}

export async function deleteCompetitor(companyId: number, competitorId: number) {
  const db = await D();
  await db.delete(competitorProfiles)
    .where(and(eq(competitorProfiles.id, competitorId), eq(competitorProfiles.companyId, companyId)));
}

// ─── Personas CRUD ────────────────────────────────────────────────────────────

export async function getPersonas(companyId: number) {
  const db = await D();
  return db.select().from(personas)
    .where(eq(personas.companyId, companyId))
    .orderBy(desc(personas.createdAt));
}

export async function upsertPersona(companyId: number, data: {
  name: string; description?: string; demographics?: Record<string, unknown>;
  painPoints?: string[]; motivations?: string[]; objections?: string[];
  buyingTriggers?: string[]; channels?: string[]; status?: "draft" | "approved"; id?: number;
}) {
  const db = await D();
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(personas).set(rest as any).where(and(eq(personas.id, id), eq(personas.companyId, companyId)));
    return;
  }
  await db.insert(personas).values({ companyId, ...data } as any);
}

export async function deletePersona(companyId: number, personaId: number) {
  const db = await D();
  await db.delete(personas).where(and(eq(personas.id, personaId), eq(personas.companyId, companyId)));
}

// ─── Master Strategy CRUD ─────────────────────────────────────────────────────

export async function getStrategy(companyId: number) {
  const db = await D();
  const rows = await db.select().from(masterStrategy)
    .where(eq(masterStrategy.companyId, companyId))
    .orderBy(desc(masterStrategy.version))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveStrategy(companyId: number, data: Partial<typeof masterStrategy.$inferInsert>) {
  const db = await D();
  const latest = await getStrategy(companyId);
  if (latest && latest.status === "draft" || latest?.status === "in_review") {
    await db.update(masterStrategy).set({ ...data, updatedAt: new Date() } as any)
      .where(eq(masterStrategy.id, latest.id));
    return getStrategy(companyId);
  }
  const version = (latest?.version ?? 0) + 1;
  await db.insert(masterStrategy).values({ companyId, version, ...data } as any);
  return getStrategy(companyId);
}

// ─── Business Understanding ───────────────────────────────────────────────────

export async function runBusinessUnderstanding(companyId: number): Promise<Record<string, unknown>> {
  const db = await D();
  const companyRows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const company = companyRows[0];
  if (!company) throw new Error("Company not found");

  const context = await buildCompanyContext(companyId);

  const prompt = `You are a senior Business Intelligence Agent. Analyze this company and produce a structured Business Understanding Report.

Company Profile:
- Name: ${company.name}
- Industry: ${company.industry ?? "Unknown"}
- Website: ${company.website ?? "Not provided"}
- Description: ${company.description ?? "Not provided"}
- Brand Voice: ${company.brandVoice ?? "Not defined"}
- Target Audience: ${company.targetAudience ?? "Not defined"}

Additional Context:
${context}

Produce a JSON report:
{
  "valuePropStatement": "One sentence core value proposition",
  "productServiceSummary": "What they sell and for whom",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "threats": ["threat 1", "threat 2"],
  "initialPositioning": "How they should position in the market",
  "uniqueSellingPoints": ["USP 1", "USP 2", "USP 3"],
  "targetMarketSummary": "Primary target market description",
  "businessGoalInference": "Inferred primary business goal",
  "knowledgeGaps": ["gap 1", "gap 2"],
  "recommendedNextSteps": ["step 1", "step 2"]
}

Return ONLY valid JSON, no other text.`;

  const llmResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a business intelligence analyst. Always respond with valid JSON only." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });
  const rawContent = llmResult.choices[0]?.message?.content;
  const rawStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  let report: Record<string, unknown> = {};
  try { report = JSON.parse(rawStr); } catch { report = { raw: rawStr }; }

  await upsertPipeline(companyId, { businessReport: report });
  try {
    await db.insert(companyMemory).values({
      companyId, key: "business_understanding_report",
      value: report, category: "brand", importance: 5, source: "agent",
    } as any);
  } catch { /* memory save failure non-critical */ }

  return report;
}

// ─── Competitor Discovery ─────────────────────────────────────────────────────

export async function runCompetitorDiscovery(companyId: number): Promise<Array<Record<string, unknown>>> {
  const db = await D();
  const companyRows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const company = companyRows[0];
  if (!company) throw new Error("Company not found");

  const existingCompetitors = (company.competitors as string[] ?? []).join(", ");

  const prompt = `You are a Competitor Intelligence Agent. Identify the top competitors for this company.

Company: ${company.name}
Industry: ${company.industry ?? "Unknown"}
Description: ${company.description ?? "Not provided"}
Known competitors: ${existingCompetitors || "None specified"}

Identify 4-6 realistic competitors and analyze each. Return JSON array:
[
  {
    "name": "Competitor Name",
    "website": "https://example.com",
    "messaging": "Their main marketing message",
    "targetAudience": "Who they target",
    "mainChannels": ["Facebook", "Google Ads"],
    "estimatedStrengths": ["brand recognition", "pricing"],
    "estimatedWeaknesses": ["poor UX", "limited service"],
    "pricingModel": "premium/mid-range/budget",
    "differentiator": "What makes them unique",
    "threatLevel": "high/medium/low"
  }
]

Return ONLY valid JSON array.`;

  const llmResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a competitor intelligence analyst. Always respond with valid JSON only." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });
  const rawContent = llmResult.choices[0]?.message?.content;
  const rawStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  let discovered: Array<Record<string, unknown>> = [];
  try {
    const parsed = JSON.parse(rawStr);
    // Handle both array and {competitors: [...]} responses
    discovered = Array.isArray(parsed) ? parsed : (parsed.competitors ?? parsed.data ?? []);
  } catch { discovered = []; }

  for (const comp of discovered) {
    await db.insert(competitorProfiles).values({
      companyId,
      name: String(comp.name ?? "Unknown"),
      website: comp.website ? String(comp.website) : undefined,
      status: "discovered",
      analysis: comp,
      strengths: (comp.estimatedStrengths as string[]) ?? [],
      weaknesses: (comp.estimatedWeaknesses as string[]) ?? [],
      discoveredBy: "system",
    } as any);
  }

  return discovered;
}

// ─── Persona Generation ───────────────────────────────────────────────────────

export async function runPersonaGeneration(companyId: number): Promise<Array<Record<string, unknown>>> {
  const db = await D();
  const companyRows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const company = companyRows[0];
  if (!company) throw new Error("Company not found");

  const confirmedCompetitors = await db.select().from(competitorProfiles)
    .where(and(eq(competitorProfiles.companyId, companyId), eq(competitorProfiles.status, "confirmed")));

  const competitorContext = confirmedCompetitors.map((c) =>
    `${c.name}: targets ${(c.analysis as any)?.targetAudience ?? "unknown audience"}`
  ).join("\n");

  const prompt = `You are a Persona & Audience Intelligence Agent. Build 3 detailed customer personas.

Company: ${company.name}
Industry: ${company.industry ?? "Unknown"}
Description: ${company.description ?? "Not provided"}
Target Audience: ${company.targetAudience ?? "Not specified"}

Competitor audience insights:
${competitorContext || "No competitor data yet"}

Return JSON array:
[
  {
    "name": "Persona Name (e.g., 'The Ambitious Entrepreneur')",
    "description": "2-sentence description",
    "demographics": {
      "ageRange": "25-35",
      "gender": "mixed",
      "location": "Urban areas",
      "income": "Middle to upper-middle class",
      "occupation": "Business owners"
    },
    "painPoints": ["pain 1", "pain 2", "pain 3"],
    "motivations": ["motivation 1", "motivation 2"],
    "objections": ["objection 1", "objection 2"],
    "buyingTriggers": ["trigger 1", "trigger 2"],
    "preferredChannels": ["Instagram", "LinkedIn"],
    "messagingAngle": "Core resonating message"
  }
]

Return ONLY valid JSON array.`;

  const llmResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a persona and audience intelligence analyst. Always respond with valid JSON only." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });
  const rawContent = llmResult.choices[0]?.message?.content;
  const rawStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  let generated: Array<Record<string, unknown>> = [];
  try {
    const parsed = JSON.parse(rawStr);
    generated = Array.isArray(parsed) ? parsed : (parsed.personas ?? parsed.data ?? []);
  } catch { generated = []; }

  for (const p of generated) {
    await db.insert(personas).values({
      companyId,
      name: String(p.name ?? "Persona"),
      description: p.description ? String(p.description) : undefined,
      demographics: (p.demographics as Record<string, unknown>) ?? {},
      painPoints: (p.painPoints as string[]) ?? [],
      motivations: (p.motivations as string[]) ?? [],
      objections: (p.objections as string[]) ?? [],
      buyingTriggers: (p.buyingTriggers as string[]) ?? [],
      channels: (p.preferredChannels as string[]) ?? [],
      status: "draft",
    } as any);
  }

  return generated;
}

// ─── Strategy Generation ──────────────────────────────────────────────────────

export async function runStrategyGeneration(companyId: number): Promise<Record<string, unknown>> {
  const db = await D();
  const companyRows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const company = companyRows[0];
  if (!company) throw new Error("Company not found");

  const pipeline = await getPipeline(companyId);
  const businessReport = (pipeline?.businessReport ?? {}) as Record<string, unknown>;
  const confirmedCompetitors = await db.select().from(competitorProfiles)
    .where(and(eq(competitorProfiles.companyId, companyId), eq(competitorProfiles.status, "confirmed")));
  const approvedPersonas = await db.select().from(personas)
    .where(and(eq(personas.companyId, companyId), eq(personas.status, "approved")));

  const competitorSummary = confirmedCompetitors.map((c) =>
    `- ${c.name}: ${(c.analysis as any)?.differentiator ?? "no differentiator"}, threat: ${(c.analysis as any)?.threatLevel ?? "unknown"}`
  ).join("\n");

  const personaSummary = approvedPersonas.map((p) =>
    `- ${p.name}: ${(p.painPoints as string[]).slice(0, 2).join(", ")}`
  ).join("\n");

  // ── Multi-Agent Deliberation: 4 specialist agents run independently ──────────
  const baseCtx = `Company: ${company.name} (${company.industry ?? "Unknown"})
Description: ${company.description ?? "Not provided"}
Value Prop: ${businessReport.valuePropStatement ?? "Not defined"}
Positioning: ${businessReport.initialPositioning ?? "Not defined"}
USPs: ${((businessReport.uniqueSellingPoints as string[]) ?? []).join(", ")}
Competitors: ${competitorSummary || "unknown"}
Personas: ${personaSummary || "unknown"}`;

  // Run 4 specialist agents in sequence (parallel would be ideal but sequential is safer for rate limits)
  const [cmoResult, paidResult, seoResult, contentResult] = await Promise.all([
    // Agent 1: CMO — positioning, brand, channel priorities
    invokeLLM({
      messages: [
        { role: "system", content: "You are the CMO. Respond with valid JSON only." },
        { role: "user", content: `${baseCtx}\n\nAs CMO, define: positioning, brandMessage, toneOfVoice, top 3 channel priorities, KPI targets.\nJSON: {"positioning":"","brandMessage":"","toneOfVoice":"","channelPriorities":["ch1","ch2","ch3"],"kpis":{"monthlyLeads":"","targetCPA":"","targetROAS":"","organicGrowth":"","engagementRate":""},"concerns":[]}` },
      ],
      response_format: { type: "json_object" },
    }),
    // Agent 2: Paid Media Director — channel strategy, paid media
    invokeLLM({
      messages: [
        { role: "system", content: "You are the Paid Media Director. Respond with valid JSON only." },
        { role: "user", content: `${baseCtx}\n\nDefine paid channel strategy and paid media plan.\nJSON: {"channelStrategy":{"primary":[{"channel":"","rationale":"","budget_pct":0}],"secondary":[{"channel":"","rationale":"","budget_pct":0}],"experimental":[{"channel":"","rationale":"","budget_pct":0}]},"paidMediaStrategy":{"monthlyBudgetRecommendation":"","primaryObjective":"","keyAudiences":[],"creativeApproach":""},"concerns":[]}` },
      ],
      response_format: { type: "json_object" },
    }),
    // Agent 3: SEO Strategist — SEO + content gaps
    invokeLLM({
      messages: [
        { role: "system", content: "You are the SEO Strategist. Respond with valid JSON only." },
        { role: "user", content: `${baseCtx}\n\nDefine the SEO strategy.\nJSON: {"seoStrategy":{"focusKeywords":[],"contentGaps":[],"technicalPriorities":[]},"concerns":[]}` },
      ],
      response_format: { type: "json_object" },
    }),
    // Agent 4: Content + CRM Strategist — content calendar, automation
    invokeLLM({
      messages: [
        { role: "system", content: "You are the Content & CRM Strategist. Respond with valid JSON only." },
        { role: "user", content: `${baseCtx}\n\nDefine content strategy and automation.\nJSON: {"contentStrategy":{"themes":[],"formats":[],"frequency":"","keyMessages":[]},"automationStrategy":{"emailSequences":[],"retargetingWindows":[],"leadNurturing":""},"concerns":[]}` },
      ],
      response_format: { type: "json_object" },
    }),
  ]);

  function extractJSON(result: any): any {
    const raw = result?.choices?.[0]?.message?.content;
    const s = typeof raw === "string" ? raw : JSON.stringify(raw ?? "{}");
    try { return JSON.parse(s); } catch { return {}; }
  }

  const cmo = extractJSON(cmoResult);
  const paid = extractJSON(paidResult);
  const seo = extractJSON(seoResult);
  const content = extractJSON(contentResult);

  // Collect all concerns from agents
  const allConcerns = [
    ...(cmo.concerns ?? []),
    ...(paid.concerns ?? []),
    ...(seo.concerns ?? []),
    ...(content.concerns ?? []),
  ].filter(Boolean);

  // Agent 5 (Synthesis): CMO reviews all agent inputs and produces final strategy
  const synthesisResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are the Chief Marketing Officer synthesizing a multi-agent strategy deliberation. Respond with valid JSON only." },
      { role: "user", content: `Synthesize these agent recommendations into a Master Marketing Strategy:

CMO recommendation: ${JSON.stringify({ positioning: cmo.positioning, brandMessage: cmo.brandMessage, toneOfVoice: cmo.toneOfVoice, kpis: cmo.kpis })}
Paid Media recommendation: ${JSON.stringify(paid.channelStrategy)}
SEO recommendation: ${JSON.stringify(seo.seoStrategy)}
Content recommendation: ${JSON.stringify(content.contentStrategy)}
Agent concerns: ${JSON.stringify(allConcerns)}

Produce unified strategy. For funnelArchitecture:
{"awareness":{"goal":"","tactics":[]},"consideration":{"goal":"","tactics":[]},"conversion":{"goal":"","tactics":[]},"retention":{"goal":"","tactics":[]}}

Also produce executionPriorities (array of 3-5 most urgent items).
JSON: {"funnelArchitecture":{},"executionPriorities":[],"overallConfidence":"high/medium/low"}
Return ONLY JSON.` },
    ],
    response_format: { type: "json_object" },
  });
  const synthesis = extractJSON(synthesisResult);

  const consensusScore = allConcerns.length === 0 ? 0.92 : allConcerns.length <= 2 ? 0.82 : 0.72;

  const strategy: Record<string, unknown> = {
    positioning: cmo.positioning ?? "",
    brandMessage: cmo.brandMessage ?? "",
    toneOfVoice: cmo.toneOfVoice ?? "",
    channelStrategy: paid.channelStrategy ?? {},
    funnelArchitecture: synthesis.funnelArchitecture ?? {},
    contentStrategy: content.contentStrategy ?? {},
    seoStrategy: seo.seoStrategy ?? {},
    paidMediaStrategy: paid.paidMediaStrategy ?? {},
    automationStrategy: content.automationStrategy ?? {},
    kpis: cmo.kpis ?? {},
    executionPriorities: synthesis.executionPriorities ?? [],
    agentConsensus: {
      consensusScore,
      supportingAgents: ["CMO", "Paid Media Director", "SEO Strategist", "Content Strategist"],
      concerns: allConcerns,
      confidence: synthesis.overallConfidence ?? (consensusScore >= 0.85 ? "high" : "medium"),
    },
  };

  await saveStrategy(companyId, {
    positioning: String(strategy.positioning ?? ""),
    brandMessage: String(strategy.brandMessage ?? ""),
    toneOfVoice: String(strategy.toneOfVoice ?? ""),
    channelStrategy: strategy.channelStrategy as any,
    funnelArchitecture: strategy.funnelArchitecture as any,
    contentStrategy: strategy.contentStrategy as any,
    seoStrategy: strategy.seoStrategy as any,
    paidMediaStrategy: strategy.paidMediaStrategy as any,
    automationStrategy: strategy.automationStrategy as any,
    kpis: strategy.kpis as any,
    executionPriorities: (strategy.executionPriorities as string[]) ?? [],
    agentConsensus: strategy.agentConsensus as any,
    status: "in_review",
  });

  try {
    await db.insert(companyMemory).values({
      companyId, key: "master_strategy_latest",
      value: strategy, category: "strategy", importance: 5, source: "agent",
    } as any);
  } catch { /* non-critical */ }

  return strategy;
}
