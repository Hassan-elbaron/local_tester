/**
 * Observability Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Runtime visibility into the brain's operational health:
 *   - System health score (healthy / warning / critical)
 *   - Execution totals (runs, failures, blocks) in a rolling 24h window
 *   - Per-connector metrics (success/fail counts per adapter)
 *   - Latest execution events for real-time feed
 *
 * All queries hit execution_logs only — no extra tables needed.
 */

import { getDb } from "./db";
import { executionLogs } from "../drizzle/schema";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

// ─── System Health ─────────────────────────────────────────────────────────────
export interface SystemHealth {
  health:       "healthy" | "warning" | "critical";
  windowHours:  number;
  totals: {
    brainRuns:          number;
    failedExecutions:   number;
    blockedExecutions:  number;
    completedExecutions:number;
  };
  healthReasons: string[];
  latestEvents:  (typeof executionLogs.$inferSelect)[];
}

export async function getSystemHealth(companyId: number): Promise<SystemHealth> {
  const db = await getDb();
  if (!db) return {
    health: "critical", windowHours: 24,
    totals: { brainRuns: 0, failedExecutions: 0, blockedExecutions: 0, completedExecutions: 0 },
    healthReasons: ["Database unavailable"],
    latestEvents: [],
  };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [runsRows, failedRows, blockedRows, completedRows, latestEvents] = await Promise.all([
    // Total brain_run entries
    db.select({ value: count() })
      .from(executionLogs)
      .where(and(
        eq(executionLogs.companyId, companyId),
        eq(executionLogs.actionType, "brain_run"),
        gte(executionLogs.createdAt, since),
      )),

    // Failed executions (any actionType)
    db.select({ value: count() })
      .from(executionLogs)
      .where(and(
        eq(executionLogs.companyId, companyId),
        eq(executionLogs.status, "failed"),
        gte(executionLogs.createdAt, since),
      )),

    // Blocked executions
    db.select({ value: count() })
      .from(executionLogs)
      .where(and(
        eq(executionLogs.companyId, companyId),
        eq(executionLogs.status, "blocked"),
        gte(executionLogs.createdAt, since),
      )),

    // Completed executions
    db.select({ value: count() })
      .from(executionLogs)
      .where(and(
        eq(executionLogs.companyId, companyId),
        eq(executionLogs.status, "completed"),
        gte(executionLogs.createdAt, since),
      )),

    // Latest 20 events (any type)
    db.select()
      .from(executionLogs)
      .where(and(
        eq(executionLogs.companyId, companyId),
        gte(executionLogs.createdAt, since),
      ))
      .orderBy(desc(executionLogs.createdAt))
      .limit(20),
  ]);

  const total     = Number(runsRows[0]?.value      ?? 0);
  const failed    = Number(failedRows[0]?.value     ?? 0);
  const blocked   = Number(blockedRows[0]?.value    ?? 0);
  const completed = Number(completedRows[0]?.value  ?? 0);

  // ── Health classification ─────────────────────────────────────────────────
  const reasons: string[] = [];
  let health: "healthy" | "warning" | "critical" = "healthy";

  const failRate = total > 0 ? failed / total : 0;

  if (failed >= 5 || failRate > 0.3) {
    health = "critical";
    reasons.push(`High failure rate: ${failed} failures (${(failRate * 100).toFixed(0)}%)`);
  } else if (failed > 0 || blocked > 3) {
    health = "warning";
    if (failed > 0)  reasons.push(`${failed} failed execution(s) in last 24h`);
    if (blocked > 3) reasons.push(`${blocked} blocked execution(s) — check approval backlog`);
  }

  if (total === 0) reasons.push("No brain runs recorded in the last 24h");
  if (health === "healthy" && reasons.length === 0) {
    reasons.push(`All systems operational — ${completed} completed run(s)`);
  }

  return {
    health,
    windowHours: 24,
    totals: {
      brainRuns:          total,
      failedExecutions:   failed,
      blockedExecutions:  blocked,
      completedExecutions:completed,
    },
    healthReasons: reasons,
    latestEvents,
  };
}

// ─── Connector Metrics ─────────────────────────────────────────────────────────
export interface ConnectorMetric {
  executor:   string;
  actionType: string;
  status:     string;
  total:      number;
}

export async function getConnectorMetrics(companyId: number): Promise<ConnectorMetric[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      executor:   executionLogs.executor,
      actionType: executionLogs.actionType,
      status:     executionLogs.status,
      total:      count(),
    })
    .from(executionLogs)
    .where(eq(executionLogs.companyId, companyId))
    .groupBy(
      executionLogs.executor,
      executionLogs.actionType,
      executionLogs.status,
    )
    .orderBy(desc(sql`count(*)`));

  return rows.map(r => ({
    executor:   r.executor,
    actionType: r.actionType,
    status:     r.status,
    total:      Number(r.total),
  }));
}
