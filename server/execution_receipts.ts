/**
 * Execution Receipts
 * ──────────────────────────────────────────────────────────────────────────────
 * Handles the adapter pattern for external / internal execution, produces
 * standardized ExecutionReceipts, and persists them to the execution_logs table.
 *
 * To add a real external adapter (e.g. Meta Ads, Google Ads):
 *   1. Create a class that implements ExecutionAdapter
 *   2. Push it into EXECUTION_ADAPTERS below
 *   3. Set canHandle() to match the target string used in BrainExecutionRequest
 *
 * Every execution — success or failure — MUST produce a receipt and be
 * persisted via persistExecutionReceipt().
 */

import { getDb } from "./db";
import { executionLogs } from "../drizzle/schema";
import {
  BrainDecision,
  BrainExecutionRequest,
  ExecutionReceipt,
  MemoryWriteRequest,
} from "./orchestration_contract";
import { WebhookExecutionAdapter } from "./execution_adapters/webhook_adapter";
import { EmailExecutionAdapter } from "./execution_adapters/email_adapter";
import { MetaAdsExecutionAdapter } from "./execution_adapters/meta_ads_adapter";
import { SendGridEmailExecutionAdapter } from "./execution_adapters/sendgrid_email_adapter";
import { CrmExecutionAdapter } from "./execution_adapters/crm_adapter";
import { CmsExecutionAdapter } from "./execution_adapters/cms_adapter";

// ─── External Result (from adapter) ──────────────────────────────────────────
export interface ExternalExecutionResult {
  ok: boolean;
  externalRef?: string;
  summary: string;
  payload?: unknown;
  error?: string;
}

// ─── Adapter Interface ────────────────────────────────────────────────────────
export interface ExecutionAdapter {
  target: string;
  canHandle(target: string): boolean;
  execute(req: BrainExecutionRequest): Promise<ExternalExecutionResult>;
}

// ─── Internal No-op Adapter ───────────────────────────────────────────────────
// Handles the "internal" target — prepares the execution plan without
// touching any external system. Safe to run without explicit approval
// because the gate already blocked non-approved calls.
export class InternalNoopAdapter implements ExecutionAdapter {
  target = "internal";

  canHandle(target: string): boolean {
    return target === "internal";
  }

  async execute(req: BrainExecutionRequest): Promise<ExternalExecutionResult> {
    return {
      ok: true,
      externalRef: `internal_${req.taskId}_${Date.now()}`,
      summary: `Internal execution prepared for task="${req.taskId}", target="${req.target}"`,
      payload: {
        proposalType: req.payload.proposalType,
        mode: req.mode,
        preparedAt: new Date().toISOString(),
      },
    };
  }
}

// ─── Adapter Registry ─────────────────────────────────────────────────────────
// Adapters are checked in order — first canHandle() match wins.
// Typed connectors (email) are checked before the generic webhook fallback.
const EXECUTION_ADAPTERS: ExecutionAdapter[] = [
  new MetaAdsExecutionAdapter(),        // real: campaign    → Meta Ads Graph API
  new SendGridEmailExecutionAdapter(),   // real: support     → SendGrid v3 API
  new CrmExecutionAdapter(),             // real: community   → CRM webhook bridge
  new CmsExecutionAdapter(),             // real: content     → CMS webhook bridge
  new EmailExecutionAdapter(),           // legacy: email webhook fallback
  new WebhookExecutionAdapter(),         // generic: content / optimization
  new InternalNoopAdapter(),             // fallback: all other internal tasks
];

function resolveAdapter(target: string): ExecutionAdapter | undefined {
  return EXECUTION_ADAPTERS.find(adapter => adapter.canHandle(target));
}

// ─── Run Execution + Produce Receipt ─────────────────────────────────────────
export async function runExecutionWithReceipt(
  req: BrainExecutionRequest,
): Promise<{
  receipt: ExecutionReceipt;
  memoryWrite: MemoryWriteRequest;
}> {
  const adapter = resolveAdapter(req.target);

  if (!adapter) {
    const receipt: ExecutionReceipt = {
      executor: "execution_router",
      status: "failed",
      summary: `No adapter registered for target="${req.target}"`,
      payload: { target: req.target, mode: req.mode },
      executedAt: new Date().toISOString(),
    };
    return {
      receipt,
      memoryWrite: {
        companyId: req.companyId,
        scope: "execution",
        key: `task_${req.taskId}_receipt`,
        value: receipt,
        confidence: 1,
        source: "execution_router",
      },
    };
  }

  const result = await adapter.execute(req);

  const receipt: ExecutionReceipt = {
    executor: adapter.target,
    status: result.ok ? "completed" : "failed",
    externalRef: result.externalRef,
    summary: result.summary,
    payload: result.payload ?? { error: result.error ?? null },
    executedAt: new Date().toISOString(),
  };

  return {
    receipt,
    memoryWrite: {
      companyId: req.companyId,
      scope: "execution",
      key: `task_${req.taskId}_receipt`,
      value: receipt,
      confidence: result.ok ? 1 : 0.4,
      source: adapter.target,
    },
  };
}

// ─── Persist Receipt to DB ────────────────────────────────────────────────────
export async function persistExecutionReceipt(params: {
  companyId: number;
  proposalId?: number;
  taskId: string;
  decision: BrainDecision;
  request: BrainExecutionRequest;
  receipt: ExecutionReceipt;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(executionLogs).values({
    companyId: params.companyId,
    proposalId: params.proposalId ?? null,
    taskId: params.taskId,
    actionType: params.request.target,
    status: params.receipt.status,
    executor: params.receipt.executor,
    externalRef: params.receipt.externalRef ?? null,
    summary: params.receipt.summary,
    payload: {
      decision: {
        status: params.decision.status,
        recommendation: params.decision.recommendation,
        confidence: params.decision.confidence,
        riskScore: params.decision.riskScore,
      },
      request: {
        mode: params.request.mode,
        target: params.request.target,
        payload: params.request.payload,
      },
      receipt: params.receipt,
    },
    executedAt: params.receipt.executedAt
      ? new Date(params.receipt.executedAt)
      : new Date(),
  });
}
