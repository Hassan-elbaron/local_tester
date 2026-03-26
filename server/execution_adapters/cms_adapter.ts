/**
 * CMS Execution Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed webhook bridge to any CMS (WordPress, Contentful, Ghost, Strapi, etc.)
 * via a standard bridge endpoint. No direct CMS SDK dependency.
 *
 * Required ENV:
 *   CMS_CONNECTOR_WEBHOOK_URL — bridge endpoint that accepts the payload below
 *
 * Optional ENV:
 *   CMS_CONNECTOR_SECRET      — shared secret sent as X-Brain-Secret header
 *   CMS_CONNECTOR_TIMEOUT_MS  — request timeout in ms (default 15000)
 *
 * externalRef = json.id | json.ref | json.slug | x-request-id | x-reference-id
 */

import type { ExecutionAdapter, ExternalExecutionResult } from "../execution_receipts";
import type { BrainExecutionRequest } from "../orchestration_contract";

// ─── Payload shape ────────────────────────────────────────────────────────────
interface CmsPayload {
  action:    "create_draft" | "update_draft" | "publish_post" | "create_page";
  title?:    string;
  content?:  string;
  slug?:     string;
  status?:   "draft" | "published";
  metadata?: Record<string, unknown>;
}

function isCmsPayload(payload: unknown): payload is CmsPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    p["action"] === "create_draft"  ||
    p["action"] === "update_draft"  ||
    p["action"] === "publish_post"  ||
    p["action"] === "create_page"
  );
}

// ─── Adapter ──────────────────────────────────────────────────────────────────
export class CmsExecutionAdapter implements ExecutionAdapter {
  target = "cms";

  canHandle(target: string): boolean {
    return target === "cms";
  }

  async execute(req: BrainExecutionRequest): Promise<ExternalExecutionResult> {
    // ── Payload validation ────────────────────────────────────────────────
    if (!isCmsPayload(req.payload)) {
      return {
        ok:      false,
        summary: "Invalid CMS payload",
        error:   "Payload must contain a valid CMS action (create_draft | update_draft | publish_post | create_page)",
      };
    }

    const webhookUrl = process.env.CMS_CONNECTOR_WEBHOOK_URL;
    const secret     = process.env.CMS_CONNECTOR_SECRET;
    const timeoutMs  = Number(process.env.CMS_CONNECTOR_TIMEOUT_MS ?? 15_000);

    // ── Config guard ──────────────────────────────────────────────────────
    if (!webhookUrl) {
      return {
        ok:      false,
        summary: "Missing CMS connector configuration",
        error:   "CMS_CONNECTOR_WEBHOOK_URL not set",
      };
    }

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type":      "application/json",
        "X-Brain-Task-Id":   req.taskId,
        "X-Brain-Connector": "cms",
      };
      if (secret) headers["X-Brain-Secret"] = secret;

      const res = await fetch(webhookUrl, {
        method:  "POST",
        signal:  controller.signal,
        headers,
        body: JSON.stringify({
          companyId:  req.companyId,
          proposalId: req.proposalId ?? null,
          taskId:     req.taskId,
          action:     req.payload.action,
          title:      req.payload.title   ?? null,
          content:    req.payload.content ?? null,
          slug:       req.payload.slug    ?? null,
          status:     req.payload.status  ?? "draft",
          metadata:   req.payload.metadata ?? {},
          sentAt:     new Date().toISOString(),
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        return {
          ok:      false,
          summary: `CMS connector error (HTTP ${res.status})`,
          error:   text.slice(0, 2000),
        };
      }

      // ── Extract externalRef ───────────────────────────────────────────
      let ref: string | undefined;
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        const id = json["id"] ?? json["ref"] ?? json["slug"];
        ref = typeof id === "string" ? id : id != null ? String(id) : undefined;
      } catch {
        ref =
          res.headers.get("x-request-id")  ??
          res.headers.get("x-reference-id") ??
          undefined;
      }

      return {
        ok:          true,
        externalRef: ref || undefined,
        summary:     `CMS action executed: ${req.payload.action}`,
        payload:     { response: text.slice(0, 2000) },
      };

    } catch (err: unknown) {
      const msg       = err instanceof Error ? err.message : "unknown error";
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return {
        ok:      false,
        summary: isTimeout ? "CMS request timed out" : "CMS request failed",
        error:   msg,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
