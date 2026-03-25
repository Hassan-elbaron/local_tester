/**
 * Execution Pipeline — Central Orchestrator with State Machine
 *
 * Stage flow: STRATEGY_APPROVED → FUNNELS_BUILT → CONTENT_PLANNED
 *             → ASSETS_MAPPED → COPY_GENERATED → CAMPAIGNS_READY
 *
 * Dependency rules:
 *  - runFunnelBuild     requires: approved master_strategy
 *  - runContentPlanning requires: funnels_built
 *  - runAssetMapping    requires: content_planned
 *  - runCopyGeneration  requires: assets_mapped (or content_planned at minimum)
 *  - runCampaignBuild   requires: funnels_built + content_planned + personas
 *
 * ALL execution logic lives here. Frontend is Trigger + Viewer only.
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  funnels, contentCalendar, campaignBuilds,
  masterStrategy, personas, competitorProfiles, companies, auditLogs,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { advancePipelineStage, getPipeline } from "./pipeline";
import { bulkGenerateCopy } from "./copy_engine";
import { runAssetMapping } from "./asset_system";

// ─── Stage Registry ────────────────────────────────────────────────────────────

export const EXECUTION_STAGES = {
  FUNNELS_BUILT:    "funnels_built",
  CONTENT_PLANNED:  "content_planned",
  ASSETS_MAPPED:    "assets_mapped",
  COPY_GENERATED:   "copy_generated",
  CAMPAIGNS_READY:  "campaigns_ready",
} as const;

export type ExecutionStageName = typeof EXECUTION_STAGES[keyof typeof EXECUTION_STAGES];

const STAGE_ORDER: ExecutionStageName[] = [
  "funnels_built", "content_planned", "assets_mapped", "copy_generated", "campaigns_ready",
];

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

async function log(companyId: number, action: string, summary: string, phase: "start" | "success" | "failure", detail?: string) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      companyId,
      entityType: "execution_pipeline" as any,
      entityId: companyId,
      action: `${action}_${phase}`,
      actor: "system",
      summary: `[${phase.toUpperCase()}] ${summary}`,
      metadata: detail ? { detail } as any : undefined,
    } as any);
  } catch { /* non-critical */ }
}

// ─── Execution Status ──────────────────────────────────────────────────────────

export async function getExecutionStatus(companyId: number): Promise<{
  stages: Record<ExecutionStageName, boolean>;
  currentStep: string;
  nextStep: string | null;
  isComplete: boolean;
  funnelCount: number;
  contentCount: number;
  campaignCount: number;
}> {
  const db = await D();
  const pipeline = await getPipeline(companyId);
  const completed = (pipeline?.completedStages as string[]) ?? [];

  const stages: Record<ExecutionStageName, boolean> = {
    funnels_built:   completed.includes("funnels_built"),
    content_planned: completed.includes("content_planned"),
    assets_mapped:   completed.includes("assets_mapped"),
    copy_generated:  completed.includes("copy_generated"),
    campaigns_ready: completed.includes("campaigns_ready"),
  };

  const [funnelRows, contentRows, campaignRows] = await Promise.all([
    db.select().from(funnels).where(eq(funnels.companyId, companyId)),
    db.select().from(contentCalendar).where(eq(contentCalendar.companyId, companyId)),
    db.select().from(campaignBuilds).where(eq(campaignBuilds.companyId, companyId)),
  ]);

  const nextStep = STAGE_ORDER.find(s => !stages[s]) ?? null;
  const lastDone = [...STAGE_ORDER].reverse().find(s => stages[s]) ?? "none";

  return {
    stages,
    currentStep: lastDone,
    nextStep,
    isComplete: STAGE_ORDER.every(s => stages[s]),
    funnelCount: funnelRows.length,
    contentCount: contentRows.length,
    campaignCount: campaignRows.length,
  };
}

// ─── Pre-flight Check ─────────────────────────────────────────────────────────

export async function preflightCheck(companyId: number): Promise<{
  ok: boolean;
  issues: string[];
  warnings: string[];
  checks: Record<string, boolean>;
}> {
  const db = await D();
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check 1: Approved strategy
  const [strat] = await db.select().from(masterStrategy)
    .where(and(eq(masterStrategy.companyId, companyId), eq(masterStrategy.status, "approved")))
    .limit(1);
  const hasApprovedStrategy = !!strat;
  if (!hasApprovedStrategy) issues.push("No approved Master Strategy found");

  // Check 2: Funnels built
  const funnelRows = await db.select().from(funnels).where(eq(funnels.companyId, companyId));
  const hasFunnels = funnelRows.length > 0;
  if (!hasFunnels) issues.push("No funnels built yet — run Funnel Build first");
  const hasApprovedFunnels = funnelRows.some(f => f.status === "approved");
  if (hasFunnels && !hasApprovedFunnels) warnings.push("Funnels exist but none are approved");

  // Check 3: Content planned
  const contentRows = await db.select().from(contentCalendar).where(eq(contentCalendar.companyId, companyId));
  const hasContent = contentRows.length > 0;
  if (!hasContent) warnings.push("No content items planned yet");

  // Check 4: Personas
  const personaRows = await db.select().from(personas)
    .where(and(eq(personas.companyId, companyId), eq(personas.status, "approved")));
  const hasPersonas = personaRows.length > 0;
  if (!hasPersonas) warnings.push("No approved personas — audience targeting will be generic");

  // Check 5: Copy status
  const briefedItems = contentRows.filter(c => c.copyStatus === "briefed" || c.copyStatus === "planned");
  const writtenItems = contentRows.filter(c => c.copyStatus === "copywritten" || c.copyStatus === "approved");
  if (contentRows.length > 0 && writtenItems.length === 0) {
    warnings.push(`${briefedItems.length} content items need copy generation`);
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    checks: {
      strategy_approved: hasApprovedStrategy,
      funnels_built: hasFunnels,
      funnels_approved: hasApprovedFunnels,
      content_planned: hasContent,
      personas_approved: hasPersonas,
      copy_generated: writtenItems.length > 0,
    },
  };
}

// ─── Shared Context Builder ────────────────────────────────────────────────────

async function buildExecContext(companyId: number) {
  const db = await D();
  const [co] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const [strat] = await db.select().from(masterStrategy)
    .where(eq(masterStrategy.companyId, companyId)).orderBy(desc(masterStrategy.version)).limit(1);
  const approvedPersonas = await db.select().from(personas)
    .where(and(eq(personas.companyId, companyId), eq(personas.status, "approved")));
  const confirmedComps = await db.select().from(competitorProfiles)
    .where(and(eq(competitorProfiles.companyId, companyId), eq(competitorProfiles.status, "confirmed")));

  if (!strat) throw new Error("No approved strategy found. Complete the Strategy stage first.");

  return {
    companyId,
    companyName: co?.name ?? "Unknown",
    industry: co?.industry ?? "Unknown",
    description: co?.description ?? "",
    strategy: strat,
    personas: approvedPersonas,
    competitors: confirmedComps,
  };
}

// ─── STEP 1: Funnel Build ─────────────────────────────────────────────────────
// Requires: approved master_strategy
// Produces: 4 funnels (awareness/consideration/conversion/retention) in DB

export async function runFunnelBuild(companyId: number): Promise<any[]> {
  await log(companyId, "funnel_build", "Starting funnel build from approved strategy", "start");

  const db = await D();
  const ctx = await buildExecContext(companyId);

  // Dependency: must have approved strategy
  if (ctx.strategy.status !== "approved" && ctx.strategy.status !== "in_review") {
    const msg = "Strategy must be in approved or in_review status to build funnels";
    await log(companyId, "funnel_build", msg, "failure");
    throw new Error(msg);
  }

  const stratJson = JSON.stringify({
    positioning: ctx.strategy.positioning,
    channelStrategy: ctx.strategy.channelStrategy,
    funnelArchitecture: ctx.strategy.funnelArchitecture,
    kpis: ctx.strategy.kpis,
    executionPriorities: ctx.strategy.executionPriorities,
    paidMediaStrategy: ctx.strategy.paidMediaStrategy,
  });
  const personaContext = ctx.personas.map(p =>
    `${p.name}: pain=${((p.painPoints as string[]) ?? [])[0] ?? ""}, channels=${(p.channels as string[]).join(",")}`
  ).join(" | ") || "General audience";

  // Agent 1: Funnel Architect — designs full funnel structure
  const architectResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a Funnel Architect. Design end-to-end marketing funnels that map directly to the approved strategy. Respond with valid JSON only." },
      { role: "user", content: `Design 4 detailed marketing funnels for:
Company: ${ctx.companyName} (${ctx.industry})
Description: ${ctx.description}
Strategy: ${stratJson}
Target Personas: ${personaContext}

Create one funnel per stage: awareness, consideration, conversion, retention.
Each funnel must directly reflect the strategy's channel priorities and KPI targets.

For each funnel return:
{
  "name": "descriptive name that reflects the goal",
  "goal": "specific measurable goal with number (e.g. 'Reach 50,000 unique users per month')",
  "stage": "awareness|consideration|conversion|retention",
  "channels": ["channel1", "channel2"],
  "steps": [{"step":1,"action":"action name","description":"what happens","cta":"exact CTA text"}],
  "kpis": {"MetricName":"Target"},
  "budgetPct": 25,
  "entryPoint": "where audience first encounters the funnel",
  "conversionEvent": "what counts as a conversion in this stage",
  "retargetingPath": "what happens to non-converters",
  "automationPath": "automated follow-up sequence"
}

Budget allocation must sum to 100%.
Return JSON array of exactly 4 funnels.` },
    ],
    response_format: { type: "json_object" },
  });

  // Agent 2: Performance Lead — validates and enhances KPI benchmarks
  const perfResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are the Performance Marketing Lead. Set realistic KPI benchmarks based on industry data. Respond with valid JSON only." },
      { role: "user", content: `Set KPI benchmarks for ${ctx.companyName} (${ctx.industry}) funnels.
Strategy KPI targets: ${JSON.stringify(ctx.strategy.kpis ?? {})}

Return realistic benchmarks for each stage:
{
  "awareness":    {"CPM":"$X","Reach":"X","EngagementRate":"X%","ClickThrough":"X%"},
  "consideration":{"CTR":"X%","VideoViews":"X","WebsiteVisits":"X","TimeOnSite":"Xs"},
  "conversion":   {"CPA":"$X","ConversionRate":"X%","ROAS":"Xx","CartAbandonmentRate":"X%"},
  "retention":    {"RepeatPurchaseRate":"X%","CLV":"$X","ChurnRate":"X%","NPS":"X"}
}
Return ONLY JSON.` },
    ],
    response_format: { type: "json_object" },
  });

  const funnelRaw = parseJSON<any>(llmText(architectResult), []);
  const kpiBenchmarks = parseJSON<any>(llmText(perfResult), {});
  const funnelList = Array.isArray(funnelRaw) ? funnelRaw : (funnelRaw.funnels ?? funnelRaw.data ?? []);

  const enhanced = funnelList.map((f: any) => ({
    ...f,
    kpis: { ...(f.kpis ?? {}), ...(kpiBenchmarks[f.stage] ?? {}) },
  }));

  const validStages = ["awareness", "consideration", "conversion", "retention"];
  const saved: any[] = [];
  for (const f of enhanced) {
    const stage = validStages.includes(f.stage) ? f.stage : "awareness";
    await db.insert(funnels).values({
      companyId,
      strategyId: ctx.strategy.id,
      name: String(f.name ?? `${stage} Funnel`),
      goal: f.goal ? String(f.goal) : undefined,
      stage: stage as any,
      channels: Array.isArray(f.channels) ? f.channels : [],
      steps: Array.isArray(f.steps) ? f.steps : [],
      kpis: f.kpis ?? {},
      budgetPct: typeof f.budgetPct === "number" ? f.budgetPct : 25,
      entryPoint: f.entryPoint ? String(f.entryPoint) : undefined,
      conversionEvent: f.conversionEvent ? String(f.conversionEvent) : undefined,
      retargetingPath: f.retargetingPath ? String(f.retargetingPath) : undefined,
      automationPath: f.automationPath ? String(f.automationPath) : undefined,
      status: "draft",
    } as any);
    saved.push(f);
  }

  await advancePipelineStage(companyId, EXECUTION_STAGES.FUNNELS_BUILT);
  await log(companyId, "funnel_build", `${saved.length} funnels saved to DB`, "success");
  return enhanced;
}

// ─── STEP 2: Content Planning ─────────────────────────────────────────────────
// Requires: funnels_built
// Produces: content calendar items in DB, each linked to a funnel

export async function runContentPlanning(companyId: number, months = 1): Promise<any[]> {
  await log(companyId, "content_planning", "Starting content planning from funnels", "start");

  const db = await D();

  // Dependency: funnels must exist
  const activeFunnels = await db.select().from(funnels).where(eq(funnels.companyId, companyId));
  if (activeFunnels.length === 0) {
    const msg = "No funnels found. Run Funnel Build before Content Planning.";
    await log(companyId, "content_planning", msg, "failure");
    throw new Error(msg);
  }

  const ctx = await buildExecContext(companyId);
  const funnelSummary = activeFunnels.map(f =>
    `${f.name} (${f.stage}): goal=${f.goal ?? "undefined"}, channels=${(f.channels as string[]).join(",")}, kpis=${JSON.stringify(f.kpis ?? {})}`
  ).join("\n");

  const totalPosts = Math.min(5 * months * 4, 20);
  const toneOfVoice = ctx.strategy.toneOfVoice ?? "professional";
  const positioning = ctx.strategy.positioning ?? "";
  const brandMessage = ctx.strategy.brandMessage ?? "";
  const personaContext = ctx.personas.map(p =>
    `${p.name}: pain=${((p.painPoints as string[]) ?? [])[0] ?? ""}, channels=${(p.channels as string[]).join(",")}`
  ).join("; ") || "General audience";

  // Agent 1: Content Strategist — plans calendar
  const csResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a Content Strategist. Plan a content calendar that maps directly to marketing funnels. Respond with valid JSON only." },
      { role: "user", content: `Plan a ${months}-month content calendar (${totalPosts} posts) for ${ctx.companyName}.

Active Funnels:
${funnelSummary}

Content Strategy: ${JSON.stringify(ctx.strategy.contentStrategy ?? {})}
Tone of Voice: ${toneOfVoice}
Brand Positioning: ${positioning}
Brand Message: ${brandMessage}
Target Personas: ${personaContext}

Each post must be directly linked to a funnel stage and support its goal.
Vary platforms and content formats across weeks.

Return array of ${totalPosts} items, each with:
{
  "platform": "Instagram|Facebook|LinkedIn|Twitter|TikTok|YouTube",
  "funnelStage": "awareness|consideration|conversion|retention",
  "objective": "exact measurable objective for this post",
  "concept": "post concept in one line",
  "brief": "detailed 2-3 sentence creative brief for the content creator",
  "ctaText": "exact call-to-action text",
  "visualNotes": "visual direction for designer — colors, mood, style",
  "requiredAssets": ["specific asset 1 (e.g. product photo)", "asset 2"],
  "week": 1-${months * 4},
  "month": 1-${months}
}
Return ONLY valid JSON array.` },
    ],
    response_format: { type: "json_object" },
  });

  // Agent 2: Copy Chief — generates caption templates per platform × funnel stage
  const ccResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are the Copy Chief. Generate platform-specific caption templates. Respond with valid JSON only." },
      { role: "user", content: `Generate caption templates for ${ctx.companyName}.
Tone: ${toneOfVoice}
Brand Message: ${brandMessage}
Positioning: ${positioning}
Primary persona pain: ${((ctx.personas[0]?.painPoints as string[]) ?? [])[0] ?? "general"}

For each platform × funnel stage, write a caption template (max 120 words each).
{
  "instagram": {"awareness":"...","consideration":"...","conversion":"...","retention":"..."},
  "facebook":  {"awareness":"...","consideration":"...","conversion":"...","retention":"..."},
  "linkedin":  {"awareness":"...","consideration":"...","conversion":"...","retention":"..."},
  "twitter":   {"awareness":"...","consideration":"...","conversion":"...","retention":"..."},
  "tiktok":    {"awareness":"...","consideration":"...","conversion":"...","retention":"..."},
  "youtube":   {"awareness":"...","consideration":"...","conversion":"...","retention":"..."}
}
Return ONLY JSON.` },
    ],
    response_format: { type: "json_object" },
  });

  const calendarRaw = parseJSON<any>(llmText(csResult), []);
  const captionTemplates = parseJSON<any>(llmText(ccResult), {});
  const items = Array.isArray(calendarRaw) ? calendarRaw
    : (calendarRaw.posts ?? calendarRaw.calendar ?? calendarRaw.items ?? []);

  let savedCount = 0;
  for (const item of items.slice(0, totalPosts)) {
    const platform = String(item.platform ?? "Instagram");
    const stage = String(item.funnelStage ?? "awareness");
    const template = (captionTemplates as any)[platform.toLowerCase()]?.[stage] ?? "";
    const matchFunnel = activeFunnels.find(f => f.stage === stage);

    await db.insert(contentCalendar).values({
      companyId,
      funnelId: matchFunnel?.id ?? undefined,
      platform,
      funnelStage: stage,
      objective: item.objective ? String(item.objective) : undefined,
      concept: item.concept ? String(item.concept) : undefined,
      brief: item.brief ? String(item.brief) : undefined,
      caption: template || undefined,
      ctaText: item.ctaText ? String(item.ctaText) : undefined,
      visualNotes: item.visualNotes ? String(item.visualNotes) : undefined,
      requiredAssets: Array.isArray(item.requiredAssets) ? item.requiredAssets : [],
      week: typeof item.week === "number" ? item.week : 1,
      month: typeof item.month === "number" ? item.month : 1,
      copyStatus: template ? "briefed" : "planned",
    } as any);
    savedCount++;
  }

  await advancePipelineStage(companyId, EXECUTION_STAGES.CONTENT_PLANNED);
  await log(companyId, "content_planning", `${savedCount} content items saved, linked to funnels`, "success");
  return items;
}

// ─── STEP 3: Asset Mapping ─────────────────────────────────────────────────────
// Requires: content_planned
// Produces: assetIntake records per post in DB

export async function runAssetMappingPipeline(companyId: number): Promise<{ mapped: number; gaps: any }> {
  await log(companyId, "asset_mapping", "Starting asset mapping against content calendar", "start");

  const db = await D();
  const contentRows = await db.select().from(contentCalendar).where(eq(contentCalendar.companyId, companyId));

  if (contentRows.length === 0) {
    const msg = "No content items found. Run Content Planning before Asset Mapping.";
    await log(companyId, "asset_mapping", msg, "failure");
    throw new Error(msg);
  }

  const result = await runAssetMapping(companyId);
  await advancePipelineStage(companyId, EXECUTION_STAGES.ASSETS_MAPPED);
  await log(companyId, "asset_mapping", `Mapped ${result.mapped} assets; ${result.gaps.missing?.length ?? 0} gaps identified`, "success");
  return result;
}

// ─── STEP 4: Copy Generation ──────────────────────────────────────────────────
// Requires: assets_mapped (or content_planned at minimum)
// Produces: captions + briefs for all content items

export async function runCopyGeneration(companyId: number): Promise<{ count: number }> {
  await log(companyId, "copy_generation", "Starting bulk copy generation for all content items", "start");

  const db = await D();
  const contentRows = await db.select().from(contentCalendar).where(eq(contentCalendar.companyId, companyId));

  if (contentRows.length === 0) {
    const msg = "No content items to write copy for. Run Content Planning first.";
    await log(companyId, "copy_generation", msg, "failure");
    throw new Error(msg);
  }

  try {
    const count = await bulkGenerateCopy(companyId);
    await advancePipelineStage(companyId, EXECUTION_STAGES.COPY_GENERATED);
    await log(companyId, "copy_generation", `Copy written for ${count} items`, "success");
    return { count };
  } catch (e: any) {
    await log(companyId, "copy_generation", `Copy generation failed: ${e.message}`, "failure", e.message);
    throw e;
  }
}

// ─── STEP 5: Campaign Build ───────────────────────────────────────────────────
// Requires: funnels_built + content_planned + personas
// Produces: campaign build documents in DB

export async function runCampaignBuild(companyId: number): Promise<any[]> {
  await log(companyId, "campaign_build", "Starting campaign build — running dependency check", "start");

  const db = await D();

  // Hard dependency checks
  const funnelRows = await db.select().from(funnels).where(eq(funnels.companyId, companyId));
  if (funnelRows.length === 0) {
    const msg = "Cannot build campaigns: No funnels found. Build funnels first.";
    await log(companyId, "campaign_build", msg, "failure");
    throw new Error(msg);
  }

  const contentRows = await db.select().from(contentCalendar).where(eq(contentCalendar.companyId, companyId));
  if (contentRows.length === 0) {
    const msg = "Cannot build campaigns: No content items found. Plan content first.";
    await log(companyId, "campaign_build", msg, "failure");
    throw new Error(msg);
  }

  const ctx = await buildExecContext(companyId);
  if (ctx.personas.length === 0) {
    await log(companyId, "campaign_build", "Warning: No approved personas found — audiences will be generic", "start");
  }

  const channelStrategy = JSON.stringify(ctx.strategy.channelStrategy ?? {});
  const paidStrategy = JSON.stringify(ctx.strategy.paidMediaStrategy ?? {});
  const budgetKPIs = JSON.stringify(ctx.strategy.kpis ?? {});

  const funnelSummary = funnelRows.map(f =>
    `${f.name} (${f.stage}, ${f.budgetPct ?? 25}% budget): channels=${(f.channels as string[]).join(",")}, goal=${f.goal ?? "not set"}`
  ).join("\n");

  const contentSummary = contentRows.slice(0, 10).map(c =>
    `[${c.platform}/${c.funnelStage}] ${c.concept ?? c.objective ?? "no concept"} | CTA: ${c.ctaText ?? ""}`
  ).join("\n");

  const personaContext = ctx.personas.map(p =>
    `${p.name}: age=${((p.demographics as any)?.ageRange ?? "unknown")}, pain=${((p.painPoints as string[]) ?? [])[0] ?? ""}, channels=${(p.channels as string[]).join(",")}`
  ).join(" | ") || "General audience";

  // Agent 1: Paid Media Director — campaign structure linked to funnels
  const pmdResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are the Paid Media Director. Build campaigns that directly map to approved funnels and content. Respond with valid JSON only." },
      { role: "user", content: `Build campaign structures for ${ctx.companyName} (${ctx.industry}).

Active Funnels:
${funnelSummary}

Content Sample (linked to funnels):
${contentSummary}

Channel Strategy: ${channelStrategy}
Paid Media Strategy: ${paidStrategy}
KPI Targets: ${budgetKPIs}
Personas: ${personaContext}

Create one campaign per funnel stage. Each campaign directly references its funnel.
Return array with each campaign:
{
  "name": "Campaign: [FunnelName] - [Platform]",
  "platform": "Meta|Google|TikTok|LinkedIn|Snapchat",
  "objective": "exact campaign objective",
  "linkedFunnelStage": "awareness|consideration|conversion|retention",
  "structure": {
    "campaignName": "exact name to use in ad platform",
    "adSets": [
      {"name":"Ad Set name","audience":"audience description","budget_pct":60,"placements":["Feed","Stories"],"creative_format":"Single Image|Video|Carousel"}
    ]
  },
  "audiences": [
    {"name":"audience name","description":"detailed description","targeting":{"ageRange":"18-35","interests":["list"],"behaviors":["list"],"exclusions":["list"]}}
  ],
  "budgetLogic": {
    "totalBudgetNote": "minimum viable budget recommendation",
    "distribution": {"prospecting_pct":60,"retargeting_pct":30,"testing_pct":10}
  },
  "launchChecklist": ["1. Create campaign in platform","2. Upload creatives","3. Set pixel/tracking","4. Review targeting","5. Set budget cap","6. Launch and monitor"]
}
Return ONLY valid JSON array.` },
    ],
    response_format: { type: "json_object" },
  });

  // Agent 2: Performance Lead — A/B testing matrix per campaign
  const plResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are the Performance Marketing Lead. Design a rigorous A/B testing matrix. Respond with valid JSON only." },
      { role: "user", content: `Design A/B testing matrix for ${ctx.companyName} campaigns.
KPI targets: ${budgetKPIs}
Funnels: ${funnelSummary}
Personas: ${personaContext}

Test across: headlines, creative formats, audiences, CTAs, landing pages, ad placements.
{
  "tests": [
    {
      "element": "headline|creative|audience|cta|landing_page|placement",
      "variantA": "description of variant A",
      "variantB": "description of variant B",
      "hypothesis": "We believe [A/B] will outperform because...",
      "successMetric": "Primary metric to determine winner",
      "minSampleSize": 1000,
      "linkedFunnelStage": "awareness|consideration|conversion|retention"
    }
  ]
}
Include at least 6 tests covering different funnel stages.
Return ONLY JSON.` },
    ],
    response_format: { type: "json_object" },
  });

  // Agent 3: Budget Controller — budget distribution and risk flags
  const bcResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are the Budget Controller. Set conservative, scalable budget recommendations. Respond with valid JSON only." },
      { role: "user", content: `Budget recommendations for ${ctx.companyName} campaigns.
Paid Strategy: ${paidStrategy}
KPI Targets: ${budgetKPIs}
Funnels: ${funnelSummary}

{
  "budgetNote": "overall strategy recommendation",
  "minimumViableBudget": "minimum monthly budget to see results",
  "distribution": {"awareness_pct":30,"consideration_pct":25,"conversion_pct":35,"retargeting_pct":10},
  "scalingTriggers": ["Trigger 1: when X metric reaches Y","Trigger 2: ..."],
  "pauseTriggers": ["Pause if CPA exceeds X","Pause if CTR drops below Y"],
  "cautionFlags": ["flag 1: risk description","flag 2: ..."]
}
Return ONLY JSON.` },
    ],
    response_format: { type: "json_object" },
  });

  const campaignsRaw = parseJSON<any>(llmText(pmdResult), []);
  const abTests = parseJSON<any>(llmText(plResult), { tests: [] });
  const budgetRec = parseJSON<any>(llmText(bcResult), {});

  const campaigns = Array.isArray(campaignsRaw) ? campaignsRaw : (campaignsRaw.campaigns ?? []);

  for (const c of campaigns.slice(0, 5)) {
    const stage = c.linkedFunnelStage ?? (
      c.name?.toLowerCase().includes("retarget") ? "conversion"
      : c.objective?.toLowerCase().includes("aware") ? "awareness" : "conversion"
    );
    const matchFunnel = funnelRows.find(f => f.stage === stage);

    // Filter A/B tests relevant to this campaign
    const campaignTests = (abTests.tests ?? []).filter((t: any) =>
      !t.linkedFunnelStage || t.linkedFunnelStage === stage
    );

    const buildDoc = [
      `═══════════════════════════════════════`,
      `CAMPAIGN BUILD DOCUMENT`,
      `Campaign: ${c.name}`,
      `Platform: ${c.platform}`,
      `Objective: ${c.objective}`,
      `Linked Funnel Stage: ${stage}`,
      `Generated: ${new Date().toISOString()}`,
      `═══════════════════════════════════════`,
      ``,
      `BUDGET RECOMMENDATION`,
      `─────────────────────`,
      budgetRec.budgetNote ?? "",
      `Minimum Viable Budget: ${budgetRec.minimumViableBudget ?? "Not specified"}`,
      `Distribution: ${JSON.stringify(budgetRec.distribution ?? {})}`,
      ``,
      `SCALING TRIGGERS`,
      `────────────────`,
      ...(budgetRec.scalingTriggers ?? []).map((t: string) => `▲ ${t}`),
      ``,
      `PAUSE TRIGGERS`,
      `──────────────`,
      ...(budgetRec.pauseTriggers ?? []).map((t: string) => `⏸ ${t}`),
      ``,
      `A/B TEST MATRIX (${campaignTests.length} tests)`,
      `─────────────────────────────────`,
      ...campaignTests.slice(0, 6).map((t: any) =>
        `[${t.element?.toUpperCase()}] ${t.variantA} VS ${t.variantB}\n   Hypothesis: ${t.hypothesis}\n   Success Metric: ${t.successMetric} | Min Sample: ${t.minSampleSize ?? 1000}`
      ),
      ``,
      `CAUTION FLAGS`,
      `─────────────`,
      ...(budgetRec.cautionFlags ?? []).map((f: string) => `⚠ ${f}`),
    ].join("\n");

    await db.insert(campaignBuilds).values({
      companyId,
      funnelId: matchFunnel?.id ?? undefined,
      name: String(c.name ?? "Campaign"),
      platform: String(c.platform ?? "Meta"),
      objective: c.objective ? String(c.objective) : undefined,
      structure: c.structure ?? {},
      audiences: Array.isArray(c.audiences) ? c.audiences : [],
      budgetLogic: { ...c.budgetLogic, fullRecommendation: budgetRec },
      abTestMatrix: campaignTests,
      launchChecklist: Array.isArray(c.launchChecklist) ? c.launchChecklist : [],
      buildDocs: buildDoc,
      status: "draft",
    } as any);
  }

  await advancePipelineStage(companyId, EXECUTION_STAGES.CAMPAIGNS_READY);
  await log(companyId, "campaign_build", `${campaigns.length} campaigns built and saved to DB`, "success");
  return campaigns;
}

// ─── Full Pipeline Runner ──────────────────────────────────────────────────────

export async function runFullPipeline(companyId: number): Promise<{
  funnels: any[]; content: any[]; campaigns: any[]; copyCount: number;
}> {
  await log(companyId, "full_pipeline", "Starting full execution pipeline", "start");

  const preflight = await preflightCheck(companyId);
  if (!preflight.checks.strategy_approved) {
    const msg = "Cannot run full pipeline: strategy not approved";
    await log(companyId, "full_pipeline", msg, "failure");
    throw new Error(msg);
  }

  const funnelResult = await runFunnelBuild(companyId);
  const contentResult = await runContentPlanning(companyId, 1);
  await runAssetMappingPipeline(companyId);
  const { count: copyCount } = await runCopyGeneration(companyId);
  const campaignResult = await runCampaignBuild(companyId);

  await log(companyId, "full_pipeline", `Full pipeline complete: ${funnelResult.length} funnels, ${contentResult.length} posts, ${campaignResult.length} campaigns`, "success");

  return {
    funnels: funnelResult,
    content: contentResult,
    campaigns: campaignResult,
    copyCount,
  };
}
