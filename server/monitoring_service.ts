/**
 * Monitoring Service — Campaign / Funnel / Content Performance Tracking
 * Creates periodic snapshots, detects alerts, generates performance summaries
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  monitoringSnapshots, companies, funnels, contentCalendar, campaignBuilds, masterStrategy,
} from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { buildCompanyContext } from "./knowledge";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function getMonitoringSnapshots(companyId: number, entityType?: string) {
  const db = await D();
  const cond = entityType
    ? and(eq(monitoringSnapshots.companyId, companyId), eq(monitoringSnapshots.entityType, entityType as any))
    : eq(monitoringSnapshots.companyId, companyId);
  return db.select().from(monitoringSnapshots)
    .where(cond)
    .orderBy(desc(monitoringSnapshots.snapshotDate))
    .limit(100);
}

export async function getLatestSnapshots(companyId: number) {
  const db = await D();
  // Get the last snapshot for each entity type
  const snaps = await db.select().from(monitoringSnapshots)
    .where(eq(monitoringSnapshots.companyId, companyId))
    .orderBy(desc(monitoringSnapshots.snapshotDate))
    .limit(50);
  return snaps;
}

export async function createMonitoringSnapshot(
  companyId: number,
  entityType: "campaign" | "funnel" | "content_item" | "website" | "social_channel",
  entityId: number | null,
  platform: string | null,
  metrics: Record<string, number | string>
) {
  const db = await D();

  // Calculate alert conditions
  const alerts: Array<{ type: string; message: string; severity: "info" | "warning" | "critical" }> = [];

  if (metrics.ctr !== undefined && Number(metrics.ctr) < 0.01) {
    alerts.push({ type: "low_ctr", message: `CTR is ${(Number(metrics.ctr) * 100).toFixed(2)}% — below 1% threshold`, severity: "warning" });
  }
  if (metrics.roas !== undefined && Number(metrics.roas) < 1.5) {
    alerts.push({ type: "low_roas", message: `ROAS is ${metrics.roas} — below 1.5x threshold`, severity: "critical" });
  }
  if (metrics.bounce_rate !== undefined && Number(metrics.bounce_rate) > 70) {
    alerts.push({ type: "high_bounce", message: `Bounce rate is ${metrics.bounce_rate}% — above 70% threshold`, severity: "warning" });
  }

  const status = alerts.some(a => a.severity === "critical") ? "critical"
    : alerts.some(a => a.severity === "warning") ? "warning"
    : "on_track";

  await db.insert(monitoringSnapshots).values({
    companyId,
    entityType,
    entityId: entityId ?? undefined,
    platform: platform ?? undefined,
    metrics: metrics as any,
    impressions: metrics.impressions ? Number(metrics.impressions) : undefined,
    clicks: metrics.clicks ? Number(metrics.clicks) : undefined,
    conversions: metrics.conversions ? Number(metrics.conversions) : undefined,
    ctr: metrics.ctr ? String(metrics.ctr) as any : undefined,
    cpa: metrics.cpa ? String(metrics.cpa) as any : undefined,
    roas: metrics.roas ? String(metrics.roas) as any : undefined,
    spend: metrics.spend ? String(metrics.spend) as any : undefined,
    revenue: metrics.revenue ? String(metrics.revenue) as any : undefined,
    status: status as any,
    alerts: alerts as any,
  });

  return { status, alerts };
}

export async function analyzePerformance(companyId: number): Promise<{
  overallStatus: string;
  summary: string;
  alerts: Array<{ type: string; message: string; severity: string; entityType: string }>;
  recommendations: string[];
  kpiSummary: Record<string, unknown>;
}> {
  const db = await D();
  const [snapshots, companyRows] = await Promise.all([
    db.select().from(monitoringSnapshots)
      .where(eq(monitoringSnapshots.companyId, companyId))
      .orderBy(desc(monitoringSnapshots.snapshotDate))
      .limit(20),
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
  ]);

  const company = companyRows[0];
  if (!snapshots.length) {
    return {
      overallStatus: "no_data",
      summary: "No monitoring data yet. Add performance metrics to get analysis.",
      alerts: [],
      recommendations: ["Set up campaign tracking", "Connect analytics integrations"],
      kpiSummary: {},
    };
  }

  // Aggregate latest metrics
  const allAlerts = snapshots.flatMap(s =>
    ((s.alerts as any[]) ?? []).map(a => ({ ...a, entityType: s.entityType }))
  );

  const ctx = await buildCompanyContext(companyId);
  const snapshotSummary = snapshots.slice(0, 5).map(s => ({
    type: s.entityType,
    platform: s.platform,
    status: s.status,
    metrics: s.metrics,
  }));

  const analysisResult = await invokeLLM({
    messages: [
      { role: "system", content: "You are a Marketing Performance Analyst. Analyze monitoring snapshots and provide actionable insights." },
      { role: "user", content: `Company: ${company?.name}\nContext: ${ctx}\n\nRecent Snapshots:\n${JSON.stringify(snapshotSummary, null, 2)}\n\nActive Alerts: ${allAlerts.length}\n\nProvide analysis. Respond as JSON:\n{\n  "overallStatus": "healthy|warning|critical",\n  "summary": "2-3 sentence executive summary",\n  "recommendations": ["action1", "action2", "action3"],\n  "kpiSummary": { "avgRoas": number, "avgCtr": number, "totalImpressions": number, "criticalAlerts": number }\n}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = analysisResult.choices[0]?.message?.content;
  const analysis = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

  return {
    overallStatus: analysis.overallStatus ?? "unknown",
    summary: analysis.summary ?? "",
    alerts: allAlerts,
    recommendations: analysis.recommendations ?? [],
    kpiSummary: analysis.kpiSummary ?? {},
  };
}

export async function getPerformanceTrend(companyId: number, days: number = 30) {
  const db = await D();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select().from(monitoringSnapshots)
    .where(and(
      eq(monitoringSnapshots.companyId, companyId),
      gte(monitoringSnapshots.snapshotDate, since)
    ))
    .orderBy(monitoringSnapshots.snapshotDate);
}

export async function acknowledgeAlert(snapshotId: number, companyId: number) {
  const db = await D();
  const rows = await db.select().from(monitoringSnapshots)
    .where(and(eq(monitoringSnapshots.id, snapshotId), eq(monitoringSnapshots.companyId, companyId)))
    .limit(1);
  if (!rows[0]) throw new Error("Snapshot not found");
  await db.update(monitoringSnapshots).set({ status: "on_track" }).where(eq(monitoringSnapshots.id, snapshotId));
}
