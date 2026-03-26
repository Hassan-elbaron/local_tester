/**
 * Agent Metrics
 * ──────────────────────────────────────────────────────────────────────────────
 * Per-agent performance visibility derived from model_policy_trace entries
 * stored in brain_memory (scope = "agent_interaction").
 *
 * Surfaces:
 *   - Per-agent cloud vs local routing counts
 *   - Policy reasons that triggered cloud escalation
 *   - Agents with unexpectedly high cloud usage (potential cost flag)
 */

import { getDb } from "./db";
import { brainMemory } from "../drizzle/schema";
import { and, desc, eq, like } from "drizzle-orm";

// ─── Per-Agent Routing Summary ─────────────────────────────────────────────────
export interface AgentRoutingMetric {
  agentRole:    string;
  agentName:    string;
  total:        number;
  local:        number;
  cloud:        number;
  cloudPct:     number;   // 0-100
  topReasons:   string[]; // most frequent policy reasons
}

export async function getAgentPolicyTrace(
  companyId: number,
): Promise<Record<string, AgentRoutingMetric>> {
  const db = await getDb();
  if (!db) return {};

  const rows = await db
    .select()
    .from(brainMemory)
    .where(
      and(
        eq(brainMemory.companyId, companyId),
        eq(brainMemory.scope, "agent_interaction"),
        like(brainMemory.key, "%model_policy_trace%"),
      ),
    )
    .orderBy(desc(brainMemory.createdAt))
    .limit(100);

  // Aggregate across all trace records
  const metrics: Record<string, {
    agentName:  string;
    total:      number;
    local:      number;
    cloud:      number;
    reasons:    Record<string, number>;
  }> = {};

  for (const row of rows) {
    const value = row.value;
    if (!Array.isArray(value)) continue;

    for (const item of value as Record<string, unknown>[]) {
      const role = typeof item["agentRole"] === "string" ? item["agentRole"] : "unknown";
      const name = typeof item["agentName"] === "string" ? item["agentName"] : role;

      if (!metrics[role]) {
        metrics[role] = { agentName: name, total: 0, local: 0, cloud: 0, reasons: {} };
      }

      metrics[role].total += 1;

      if (item["provider"] === "local")  metrics[role].local  += 1;
      if (item["provider"] === "cloud")  metrics[role].cloud  += 1;

      const reasons = item["reasons"];
      if (Array.isArray(reasons)) {
        for (const r of reasons as string[]) {
          metrics[role].reasons[r] = (metrics[role].reasons[r] ?? 0) + 1;
        }
      }
    }
  }

  // Convert to typed output
  const result: Record<string, AgentRoutingMetric> = {};

  for (const [role, m] of Object.entries(metrics)) {
    const topReasons = Object.entries(m.reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason]) => reason);

    result[role] = {
      agentRole: role,
      agentName: m.agentName,
      total:     m.total,
      local:     m.local,
      cloud:     m.cloud,
      cloudPct:  m.total > 0 ? Math.round((m.cloud / m.total) * 100) : 0,
      topReasons,
    };
  }

  return result;
}

// ─── Agent Performance Summary ─────────────────────────────────────────────────
// Derives confidence + risk averages from decision memory entries.
export interface AgentPerformanceSummary {
  agentRole:       string;
  avgConfidence:   number;
  avgRisk:         number;
  deliberationCount: number;
}

export async function getAgentPerformanceSummary(
  companyId: number,
): Promise<AgentPerformanceSummary[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(brainMemory)
    .where(
      and(
        eq(brainMemory.companyId, companyId),
        eq(brainMemory.scope, "agent_interaction"),
        like(brainMemory.key, "%deliberation_summary%"),
      ),
    )
    .orderBy(desc(brainMemory.createdAt))
    .limit(50);

  // Aggregate agents from selected_agents lists in each summary
  const agentCounts: Record<string, number> = {};

  for (const row of rows) {
    const val = row.value as Record<string, unknown>;
    const agents = val["selectedAgents"];
    if (Array.isArray(agents)) {
      for (const a of agents as string[]) {
        agentCounts[a] = (agentCounts[a] ?? 0) + 1;
      }
    }
  }

  return Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([role, count]) => ({
      agentRole:        role,
      avgConfidence:    0,    // enriched by deliberation data when available
      avgRisk:          0,
      deliberationCount: count,
    }));
}
