/**
 * Email Execution Adapter
 * ──────────────────────────────────────────────────────────────────────────────
 * Typed connector for email-based execution (support / community tasks).
 * Sends a structured POST to EMAIL_CONNECTOR_WEBHOOK_URL — compatible with
 * Zapier "Send Email" action, Make "Email" module, n8n "Send Email" node,
 * or any custom email bridge endpoint.
 *
 * Payload contract (sent to the bridge):
 *   { companyId, proposalId, taskId, to, subject, body, sentAt }
 *
 * Configuration:
 *   EMAIL_CONNECTOR_WEBHOOK_URL  — Required. Bridge endpoint.
 *   EMAIL_CONNECTOR_TIMEOUT_MS   — Optional. Default 10000ms.
 */

import { BrainExecutionRequest } from "../orchestration_contract";
import { ExecutionAdapter, ExternalExecutionResult } from "../execution_receipts";

// ─── Typed payload ─────────────────────────────────────────────────────────────
interface EmailPayload {
  to:      string;
  subject: string;
  body:    string;
  cc?:     string;
  replyTo?: string;
}

function isEmailPayload(payload: unknown): payload is EmailPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p["to"]      === "string" && p["to"].trim().length > 0 &&
    typeof p["subject"] === "string" && p["subject"].trim().length > 0 &&
    typeof p["body"]    === "string" && p["body"].trim().length > 0
  );
}

const DEFAULT_TIMEOUT_MS = 10_000;

export class EmailExecutionAdapter implements ExecutionAdapter {
  target = "email";

  canHandle(target: string): boolean {
    return target === "email";
  }

  async execute(req: BrainExecutionRequest): Promise<ExternalExecutionResult> {
    // ── Payload validation ──────────────────────────────────────────────────
    if (!isEmailPayload(req.payload)) {
      return {
        ok:      false,
        summary: "Invalid email payload — missing required fields",
        error:   "Payload must contain: to (string), subject (string), body (string)",
        payload: { received: req.payload },
      };
    }

    const url     = process.env.EMAIL_CONNECTOR_WEBHOOK_URL;
    const timeout = Number(process.env.EMAIL_CONNECTOR_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

    if (!url || url.trim().length === 0) {
      return {
        ok:      false,
        summary: "Email connector skipped — EMAIL_CONNECTOR_WEBHOOK_URL not configured",
        error:   "Missing EMAIL_CONNECTOR_WEBHOOK_URL in environment",
        payload: { taskId: req.taskId, to: req.payload["to"] },
      };
    }

    const body = JSON.stringify({
      companyId:  req.companyId,
      proposalId: req.proposalId ?? null,
      taskId:     req.taskId,
      to:         req.payload["to"],
      subject:    req.payload["subject"],
      body:       req.payload["body"],
      ...(req.payload["cc"]      ? { cc:      req.payload["cc"] }      : {}),
      ...(req.payload["replyTo"] ? { replyTo: req.payload["replyTo"] } : {}),
      sentAt: new Date().toISOString(),
    });

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "X-Brain-Task-Id":   req.taskId,
          "X-Brain-Connector": "email",
          "X-Brain-Company":   String(req.companyId),
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody = "";
      try { responseBody = await res.text(); } catch { /* ignore */ }

      // Extract external reference from response
      let externalRef: string | undefined;
      try {
        const parsed = JSON.parse(responseBody);
        externalRef = typeof parsed?.ref === "string" ? parsed.ref
          : typeof parsed?.messageId === "string" ? parsed.messageId
          : undefined;
      } catch { /* not JSON */ }
      if (!externalRef) {
        externalRef =
          res.headers.get("x-request-id") ??
          res.headers.get("x-message-id") ??
          undefined;
      }

      return {
        ok:         res.ok,
        externalRef,
        summary:    `Email connector ${res.ok ? "accepted" : "rejected"}: HTTP ${res.status} → to=${req.payload["to"]}`,
        payload: {
          httpStatus:   res.status,
          responseBody: responseBody.slice(0, 2000),
          to:           req.payload["to"],
          subject:      req.payload["subject"],
        },
        error: res.ok ? undefined : `HTTP ${res.status}: ${responseBody.slice(0, 500)}`,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const message = err instanceof Error
        ? err.name === "AbortError" ? `Email connector timed out after ${timeout}ms` : err.message
        : "Unknown error";

      return {
        ok:      false,
        summary: `Email execution failed: ${message}`,
        error:   message,
        payload: { to: req.payload["to"], taskId: req.taskId },
      };
    }
  }
}
