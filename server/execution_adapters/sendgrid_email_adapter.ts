/**
 * SendGrid Email Execution Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends transactional email via SendGrid v3 API.
 * Used for support and community task executions.
 *
 * Required ENV:
 *   SENDGRID_API_KEY     — SendGrid API key (starts with SG.)
 *   SENDGRID_FROM_EMAIL  — verified sender address in SendGrid
 *
 * Optional ENV:
 *   SENDGRID_TIMEOUT_MS  — request timeout in ms (default 15000)
 *
 * externalRef = x-message-id header returned by SendGrid on success.
 */

import type { ExecutionAdapter, ExternalExecutionResult } from "../execution_receipts";
import type { BrainExecutionRequest } from "../orchestration_contract";

// ─── Payload shape ────────────────────────────────────────────────────────────
interface SendGridEmailPayload {
  to:       string;
  subject:  string;
  body:     string;
  cc?:      string;
  replyTo?: string;
}

function isSendGridEmailPayload(payload: unknown): payload is SendGridEmailPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p["to"]      === "string" &&
    typeof p["subject"] === "string" &&
    typeof p["body"]    === "string" &&
    (p["cc"]      === undefined || typeof p["cc"]      === "string") &&
    (p["replyTo"] === undefined || typeof p["replyTo"] === "string")
  );
}

// ─── Adapter ──────────────────────────────────────────────────────────────────
export class SendGridEmailExecutionAdapter implements ExecutionAdapter {
  target = "sendgrid_email";

  canHandle(target: string): boolean {
    return target === "sendgrid_email";
  }

  async execute(req: BrainExecutionRequest): Promise<ExternalExecutionResult> {
    // ── Payload validation ────────────────────────────────────────────────
    if (!isSendGridEmailPayload(req.payload)) {
      return {
        ok:      false,
        summary: "Invalid SendGrid email payload",
        error:   "Payload must contain to, subject, body",
      };
    }

    const apiKey     = process.env.SENDGRID_API_KEY;
    const fromEmail  = process.env.SENDGRID_FROM_EMAIL;
    const timeoutMs  = Number(process.env.SENDGRID_TIMEOUT_MS ?? 15_000);

    // ── Credential guard ──────────────────────────────────────────────────
    if (!apiKey || !fromEmail) {
      return {
        ok:      false,
        summary: "Missing SendGrid credentials",
        error:   "SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not set",
      };
    }

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // ── Build SendGrid v3 payload ────────────────────────────────────
      const personalizations: Record<string, unknown>[] = [
        {
          to:      [{ email: req.payload.to }],
          subject: req.payload.subject,
        },
      ];

      if (req.payload.cc) {
        personalizations[0]!["cc"] = [{ email: req.payload.cc }];
      }

      const sgBody: Record<string, unknown> = {
        personalizations,
        from:    { email: fromEmail },
        content: [{ type: "text/plain", value: req.payload.body }],
      };

      if (req.payload.replyTo) {
        sgBody["reply_to"] = { email: req.payload.replyTo };
      }

      // ── Send ──────────────────────────────────────────────────────────
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method:  "POST",
        signal:  controller.signal,
        headers: {
          "Authorization":    `Bearer ${apiKey}`,
          "Content-Type":     "application/json",
          "X-Brain-Task-Id":  req.taskId,
          "X-Brain-Connector": "sendgrid_email",
        },
        body: JSON.stringify(sgBody),
      });

      // SendGrid returns 202 Accepted on success with no body
      const text = await res.text();

      if (!res.ok) {
        return {
          ok:      false,
          summary: `SendGrid API error (HTTP ${res.status})`,
          error:   text.slice(0, 2000),
        };
      }

      const messageId =
        res.headers.get("x-message-id") ??
        res.headers.get("X-Message-Id")  ??
        undefined;

      return {
        ok:          true,
        externalRef: messageId,
        summary:     "Email sent via SendGrid",
        payload: {
          status:   res.status,
          response: text.slice(0, 2000),
        },
      };

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return {
        ok:      false,
        summary: isTimeout ? "SendGrid request timed out" : "SendGrid request failed",
        error:   msg,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
