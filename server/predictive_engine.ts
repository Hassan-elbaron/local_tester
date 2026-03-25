/**
 * Predictive Engine — Trend Detection, Anomaly Detection, Fatigue Detection
 * Uses AI + historical data to surface proactive signals
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  predictions, monitoringSnapshots, contentCalendar, companies,
} from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { buildCompanyContext } from "./knowledge";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function getPredictions(companyId: number, status?: string) {
  const db = await D();
  const cond = status
    ? and(eq(predictions.companyId, companyId), eq(predictions.status, status as any))
    : eq(predictions.companyId, companyId);
  return db.select().from(predictions).where(cond).orderBy(desc(predictions.createdAt));
}

export async function getActivePredictions(companyId: number) {
  const db = await D();
  return db.select().from(predictions)
    .where(and(eq(predictions.companyId, companyId), eq(predictions.status, "active")))
    .orderBy(desc(predictions.createdAt));
}

export async function acknowledgePrediction(companyId: number, predictionId: number) {
  const db = await D();
  await db.update(predictions).set({ status: "acknowledged", updatedAt: new Date() })
    .where(and(eq(predictions.id, predictionId), eq(predictions.companyId, companyId)));
}

export async function resolvePrediction(companyId: number, predictionId: number) {
  const db = await D();
  await db.update(predictions).set({ status: "resolved", updatedAt: new Date() })
    .where(and(eq(predictions.id, predictionId), eq(predictions.companyId, companyId)));
}

export async function runPredictiveAnalysis(companyId: number): Promise<{
  predictionsGenerated: number;
  criticalCount: number;
  highCount: number;
  topSignal: string | null;
}> {
  const db = await D();
  const companyRows = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const company = companyRows[0];
  if (!company) throw new Error("Company not found");

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [snapshots, content] = await Promise.all([
    db.select().from(monitoringSnapshots)
      .where(and(eq(monitoringSnapshots.companyId, companyId), gte(monitoringSnapshots.snapshotDate, since)))
      .orderBy(monitoringSnapshots.snapshotDate),
    db.select().from(contentCalendar)
      .where(eq(contentCalendar.companyId, companyId))
      .limit(50),
  ]);

  const ctx = await buildCompanyContext(companyId);

  // Build data summary for AI
  const snapshotSummary = snapshots.slice(-10).map(s => ({
    date: s.snapshotDate,
    entityType: s.entityType,
    platform: s.platform,
    status: s.status,
    roas: s.roas,
    ctr: s.ctr,
    conversions: s.conversions,
  }));

  const contentSummary = {
    total: content.length,
    approved: content.filter(c => c.copyStatus === "approved").length,
    published: content.filter(c => c.copyStatus === "published").length,
    platforms: Array.from(new Set(content.map(c => c.platform).filter(Boolean))),
  };

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a Predictive Marketing Analyst. Analyze data patterns and surface proactive signals: trends, anomalies, content fatigue, conversion drops, and opportunities.",
      },
      {
        role: "user",
        content: `Company: ${company.name}\nIndustry: ${company.industry ?? "general"}\nContext: ${ctx}\n\nMonitoring data (last 30 days):\n${JSON.stringify(snapshotSummary, null, 2)}\n\nContent status:\n${JSON.stringify(contentSummary, null, 2)}\n\nGenerate 4-7 predictive signals. Respond as JSON:\n{\n  "predictions": [\n    {\n      "predictionType": "trend_detection|anomaly_detection|fatigue_detection|conversion_drop|funnel_issue|opportunity_signal|churn_risk",\n      "title": "short title",\n      "description": "2-3 sentence explanation",\n      "confidence": 0.0-1.0,\n      "urgency": "immediate|high|medium|low",\n      "expectedImpact": "string",\n      "supportingData": {},\n      "suggestedAction": "concrete action to take"\n    }\n  ]\n}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = result.choices[0]?.message?.content;
  const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  const preds = (parsed.predictions ?? []) as any[];

  // Expire old active predictions before inserting new ones
  await db.update(predictions).set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(predictions.companyId, companyId), eq(predictions.status, "active")));

  for (const p of preds) {
    await db.insert(predictions).values({
      companyId,
      predictionType: p.predictionType,
      title: p.title,
      description: p.description,
      confidence: String(p.confidence ?? 0.75) as any,
      urgency: p.urgency ?? "medium",
      expectedImpact: p.expectedImpact ?? null,
      supportingData: p.supportingData ?? {},
      suggestedAction: p.suggestedAction ?? null,
      status: "active",
    });
  }

  const criticalCount = preds.filter((p: any) => p.urgency === "immediate").length;
  const highCount = preds.filter((p: any) => p.urgency === "high").length;

  return {
    predictionsGenerated: preds.length,
    criticalCount,
    highCount,
    topSignal: preds[0]?.title ?? null,
  };
}

export async function detectContentFatigue(companyId: number): Promise<{
  fatigueDetected: boolean;
  fatigueScore: number;
  recommendations: string[];
}> {
  const db = await D();
  const content = await db.select().from(contentCalendar)
    .where(eq(contentCalendar.companyId, companyId))
    .orderBy(contentCalendar.week)
    .limit(50);

  if (!content.length) return { fatigueDetected: false, fatigueScore: 0, recommendations: [] };

  // Analyze for repetition patterns
  const platforms = content.map(c => c.platform).filter(Boolean);
  const platformCounts: Record<string, number> = {};
  for (const p of platforms) { platformCounts[p!] = (platformCounts[p!] ?? 0) + 1; }

  const dominantPlatform = Object.entries(platformCounts).sort(([, a], [, b]) => b - a)[0];
  const diversityScore = Object.keys(platformCounts).length;
  const fatigueScore = Math.max(0, 100 - diversityScore * 15 - (dominantPlatform ? (dominantPlatform[1] / platforms.length > 0.5 ? 20 : 0) : 0));

  const recommendations = [];
  if (diversityScore < 3) recommendations.push("Diversify content across more platforms");
  if (dominantPlatform && dominantPlatform[1] / platforms.length > 0.6) recommendations.push(`Reduce ${dominantPlatform[0]} dominance — spread content more evenly`);
  if (content.length < 12) recommendations.push("Increase content volume for better audience engagement");

  return {
    fatigueDetected: fatigueScore > 50,
    fatigueScore,
    recommendations,
  };
}
