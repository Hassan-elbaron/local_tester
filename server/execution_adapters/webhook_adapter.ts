/**
 * Webhook Execution Adapter
 * ──────────────────────────────────────────────────────────────────────────────
 * Generic universal connector — sends a signed POST to any HTTP endpoint.
 * This is the first real external adapter in the system. It proves that:
 *   - execution can escape the process boundary
 *   - externalRef can be a real system reference
 *   - receipts can carry external evidence
 *
 * Configuration:
 *   EXECUTION_WEBHOOK_URL   — Required. Target endpoint.
 *   EXECUTION_WEBHOOK_SECRET — Optional. Sent as X-Brain-Secret header for
 *                              server-side signature verification.
 *   EXECUTION_WEBHOOK_TIMEOUT_MS — Optional. Default 10000 ms.
 *
 * Response contract (receiving server):
 *   The server SHOULD return JSON with an optional "ref" field:
 *   { "ref": "ext-ref-123", "status": "accepted" }
 *   If no "ref" is returned, the X-Request-Id response header is used instead.
 *
 * Integration examples:
 *   - Zapier / Make / n8n webhook trigger
 *   - Custom campaign launch API
 *   - Meta Ads launch proxy
 *   - Notification bridge (Slack, Teams)
 */

import {
  BrainExecutionRequest,
} from "../orchestration_contract";
import {
  ExecutionAdapter,
  ExternalExecutionResult,
} from "../execution_receipts";

const DEFAULT_TIMEOUT_MS = 10_000;

export class WebhookExecutionAdapter implements ExecutionAdapter {
  target = "webhook";

  canHandle(target: string): boolean {
    return target === "webhook";
  }

  async execute(req: BrainExecutionRequest): Promise<ExternalExecutionResult> {
    const url     = process.env.EXECUTION_WEBHOOK_URL;
    const secret  = process.env.EXECUTION_WEBHOOK_SECRET;
    const timeout = Number(process.env.EXECUTION_WEBHOOK_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

    if (!url || url.trim().length === 0) {
      return {
        ok:      false,
        summary: "Webhook skipped — EXECUTION_WEBHOOK_URL not configured",
        error:   "Missing EXECUTION_WEBHOOK_URL in environment",
        payload: { target: req.target, taskId: req.taskId },
      };
    }

    const body = JSON.stringify({
      taskId:    req.taskId,
      companyId: req.companyId,
      proposalId: req.proposalId ?? null,
      mode:      req.mode,
      target:    req.target,
      decision: {
        status:         req.decision.status,
        recommendation: req.decision.recommendation,
        confidence:     req.decision.confidence,
        riskScore:      req.decision.riskScore,
        taskId:         req.decision.taskId,
      },
      payload: req.payload,
      sentAt: new Date().toISOString(),
    });

    const headers: Record<string, string> = {
      "Content-Type":   "application/json",
      "X-Brain-Task-Id": req.taskId,
      "X-Brain-Company": String(req.companyId),
    };

    if (secret) {
      headers["X-Brain-Secret"] = secret;
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        method:  "POST",
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody: string;
      try {
        responseBody = await res.text();
      } catch {
        responseBody = "";
      }

      // Try to extract an external reference from JSON body or response header
      let externalRef: string | undefined;
      try {
        const parsed = JSON.parse(responseBody);
        externalRef = typeof parsed?.ref === "string" ? parsed.ref : undefined;
      } catch {
        /* not JSON — that's fine */
      }
      if (!externalRef) {
        externalRef =
          res.headers.get("x-request-id") ??
          res.headers.get("x-reference-id") ??
          undefined;
      }

      return {
        ok:          res.ok,
        externalRef,
        summary:     `Webhook ${res.ok ? "accepted" : "rejected"}: HTTP ${res.status} from ${url}`,
        payload: {
          httpStatus:   res.status,
          httpStatusText: res.statusText,
          responseBody: responseBody.slice(0, 2000), // cap at 2 KB for storage
          webhookUrl:   url,
        },
        error: res.ok ? undefined : `HTTP ${res.status}: ${responseBody.slice(0, 500)}`,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const message =
        err instanceof Error
          ? err.name === "AbortError"
            ? `Webhook timed out after ${timeout}ms`
            : err.message
          : "Unknown error";

      return {
        ok:      false,
        summary: `Webhook execution failed: ${message}`,
        error:   message,
        payload: { webhookUrl: url, taskId: req.taskId },
      };
    }
  }
}
