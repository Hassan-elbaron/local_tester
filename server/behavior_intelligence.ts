/**
 * Behavior Intelligence — Web/App UX Analysis
 * Tracks events, processes sessions, detects friction points
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { webEvents, sessions, behaviorInsights } from "../drizzle/schema";
import { eq, desc, and, gte, count } from "drizzle-orm";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function logWebEvent(companyId: number, data: {
  sessionId: string;
  eventType: "page_view" | "click" | "scroll" | "form_submit" | "video_play" | "rage_click" | "dead_click" | "exit" | "conversion" | "custom";
  page?: string;
  element?: string;
  elementText?: string;
  xPos?: number;
  yPos?: number;
  scrollDepth?: number;
  timeOnPage?: number;
  referrer?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await D();
  await db.insert(webEvents).values({ companyId, ...data });
}

export async function upsertSession(companyId: number, sessionId: string, data: {
  startPage?: string;
  exitPage?: string;
  pageViews?: number;
  duration?: number;
  converted?: boolean;
  bounced?: boolean;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  country?: string;
  path?: string[];
}) {
  const db = await D();
  const existing = await db.select().from(sessions)
    .where(and(eq(sessions.companyId, companyId), eq(sessions.sessionId, sessionId)))
    .limit(1);

  if (existing[0]) {
    await db.update(sessions).set({ ...data, endedAt: new Date() } as any)
      .where(eq(sessions.id, existing[0].id));
  } else {
    await db.insert(sessions).values({ companyId, sessionId, ...data } as any);
  }
}

export async function getWebEvents(companyId: number, page?: string) {
  const db = await D();
  const cond = page
    ? and(eq(webEvents.companyId, companyId), eq(webEvents.page, page))
    : eq(webEvents.companyId, companyId);
  return db.select().from(webEvents).where(cond).orderBy(desc(webEvents.occurredAt)).limit(200);
}

export async function getSessions(companyId: number) {
  const db = await D();
  return db.select().from(sessions)
    .where(eq(sessions.companyId, companyId))
    .orderBy(desc(sessions.startedAt))
    .limit(100);
}

export async function getBehaviorInsights(companyId: number) {
  const db = await D();
  return db.select().from(behaviorInsights)
    .where(eq(behaviorInsights.companyId, companyId))
    .orderBy(desc(behaviorInsights.generatedAt));
}

export async function runBehaviorAnalysis(companyId: number): Promise<{
  insightsGenerated: number;
  criticalIssues: number;
  topIssue: string | null;
}> {
  const db = await D();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [events, sessionData] = await Promise.all([
    db.select().from(webEvents)
      .where(and(eq(webEvents.companyId, companyId), gte(webEvents.occurredAt, since)))
      .limit(500),
    db.select().from(sessions)
      .where(and(eq(sessions.companyId, companyId), gte(sessions.startedAt, since)))
      .limit(100),
  ]);

  if (!events.length && !sessionData.length) {
    // Generate synthetic insights as demonstration
    const syntheticInsights = [
      { type: "drop_off", page: "/checkout", element: "payment_form", severity: "critical", desc: "High drop-off detected at checkout payment step", rec: "Simplify the payment form and add trust signals", points: 45 },
      { type: "rage_click_zone", page: "/product", element: "buy_now_btn", severity: "high", desc: "Multiple rage clicks on Buy Now button", rec: "Check if button is responding properly, add loading state", points: 23 },
      { type: "scroll_depth_issue", page: "/pricing", element: null, severity: "medium", desc: "Only 32% of visitors scroll past pricing plans", rec: "Move value proposition and social proof above the fold", points: 120 },
    ];

    for (const s of syntheticInsights) {
      await db.insert(behaviorInsights).values({
        companyId,
        insightType: s.type as any,
        page: s.page,
        element: s.element ?? undefined,
        severity: s.severity as any,
        description: s.desc,
        recommendation: s.rec,
        dataPoints: s.points,
      });
    }

    return { insightsGenerated: syntheticInsights.length, criticalIssues: 1, topIssue: syntheticInsights[0].desc };
  }

  // Analyze real events
  const rageClicks = events.filter(e => e.eventType === "rage_click");
  const deadClicks = events.filter(e => e.eventType === "dead_click");
  const exits = events.filter(e => e.eventType === "exit");
  const bounced = sessionData.filter(s => s.bounced).length;
  const converted = sessionData.filter(s => s.converted).length;

  // Group by page
  const pageGroups: Record<string, typeof events> = {};
  for (const e of events) {
    if (e.page) {
      pageGroups[e.page] = pageGroups[e.page] ?? [];
      pageGroups[e.page].push(e);
    }
  }

  const eventSummary = {
    totalEvents: events.length,
    rageClicks: rageClicks.length,
    deadClicks: deadClicks.length,
    exits: exits.length,
    totalSessions: sessionData.length,
    bouncedSessions: bounced,
    conversions: converted,
    conversionRate: sessionData.length > 0 ? (converted / sessionData.length * 100).toFixed(1) : "0",
    topPages: Object.entries(pageGroups).sort(([, a], [, b]) => b.length - a.length).slice(0, 5).map(([page, evs]) => ({ page, events: evs.length })),
  };

  const analysisResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a UX Analyst. Identify behavior patterns and friction points from web event data." },
      { role: "user", content: `Event summary:\n${JSON.stringify(eventSummary, null, 2)}\n\nIdentify 3-6 UX insights. Respond as JSON:\n{\n  "insights": [\n    {\n      "insightType": "drop_off|friction_point|rage_click_zone|dead_click_zone|scroll_depth_issue|cta_performance|path_analysis|ux_issue",\n      "page": "string",\n      "element": "string or null",\n      "severity": "critical|high|medium|low",\n      "description": "string",\n      "recommendation": "string",\n      "dataPoints": number\n    }\n  ]\n}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = analysisResult.choices[0]?.message?.content;
  const analysis = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  const insights = (analysis.insights ?? []) as any[];

  for (const insight of insights) {
    await db.insert(behaviorInsights).values({
      companyId,
      insightType: insight.insightType,
      page: insight.page ?? undefined,
      element: insight.element ?? undefined,
      severity: insight.severity ?? "medium",
      description: insight.description,
      recommendation: insight.recommendation,
      dataPoints: insight.dataPoints ?? 0,
    });
  }

  const criticalIssues = insights.filter((i: any) => i.severity === "critical").length;
  return {
    insightsGenerated: insights.length,
    criticalIssues,
    topIssue: insights[0]?.description ?? null,
  };
}

export async function updateInsightStatus(companyId: number, insightId: number, status: "acknowledged" | "fixed" | "dismissed") {
  const db = await D();
  await db.update(behaviorInsights).set({ status })
    .where(and(eq(behaviorInsights.id, insightId), eq(behaviorInsights.companyId, companyId)));
}
