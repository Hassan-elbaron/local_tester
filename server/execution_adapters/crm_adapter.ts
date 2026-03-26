/**
 * CRM Execution Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Typed webhook bridge to any CRM (HubSpot, Salesforce, Pipedrive, etc.)
 * via a standard bridge endpoint. No direct CRM SDK dependency.
 *
 * Required ENV:
 *   CRM_CONNECTOR_WEBHOOK_URL — bridge endpoint that accepts the payload below
 *
 * Optional ENV:
 *   CRM_CONNECTOR_SECRET      — shared secret sent as X-Brain-Secret header
 *   CRM_CONNECTOR_TIMEOUT_MS  — request timeout in ms (default 15000)
 *
 * externalRef = json.id | json.ref | x-request-id | x-reference-id
 */

import type { ExecutionAdapter, ExternalExecutionResult } from "../execution_receipts";
import type { BrainExecutionRequest } from "../orchestration_contract";

// ─── Payload shape ────────────────────────────────────────────────────────────
interface CrmPayload {
  action:    "create_contact" | "update_contact" | "create_lead" | "add_note";
  email?:    string;
  name?:     string;
  phone?:    string;
  company?:  string;
  note?:     string;
  metadata?: Record<string, unknown>;
}

function isCrmPayload(payload: unknown): payload is CrmPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    p["action"] === "create_contact" ||
    p["action"] === "update_contact" ||
    p["action"] === "create_lead"    ||
    p["action"] === "add_note"
  );
}

// ─── Adapter ──────────────────────────────────────────────────────────────────
export class CrmExecutionAdapter implements ExecutionAdapter {
  target = "crm";

  canHandle(target: string): boolean {
    return target === "crm";
  }

  async execute(req: BrainExecutionRequest): Promise<ExternalExecutionResult> {
    if (process.env.DEMO_MODE === "true") {
      return { ok: true, externalRef: "demo_crm_lead_789", summary: "Demo: CRM lead created (simulated)", payload: { action: req.payload.action } };
    }
    // ── Payload validation ────────────────────────────────────────────────
    if (!isCrmPayload(req.payload)) {
      return {
        ok:      false,
        summary: "Invalid CRM payload",
        error:   "Payload must contain a valid CRM action (create_contact | update_contact | create_lead | add_note)",
      };
    }

    const webhookUrl = process.env.CRM_CONNECTOR_WEBHOOK_URL;
    const secret     = process.env.CRM_CONNECTOR_SECRET;
    const timeoutMs  = Number(process.env.CRM_CONNECTOR_TIMEOUT_MS ?? 15_000);

    // ── Config guard ──────────────────────────────────────────────────────
    if (!webhookUrl) {
      return {
        ok:      false,
        summary: "Missing CRM connector configuration",
        error:   "CRM_CONNECTOR_WEBHOOK_URL not set",
      };
    }

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type":     "application/json",
        "X-Brain-Task-Id":  req.taskId,
        "X-Brain-Connector": "crm",
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
          email:      req.payload.email   ?? null,
          name:       req.payload.name    ?? null,
          phone:      req.payload.phone   ?? null,
          company:    req.payload.company ?? null,
          note:       req.payload.note    ?? null,
          metadata:   req.payload.metadata ?? {},
          sentAt:     new Date().toISOString(),
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        return {
          ok:      false,
          summary: `CRM connector error (HTTP ${res.status})`,
          error:   text.slice(0, 2000),
        };
      }

      // ── Extract externalRef ───────────────────────────────────────────
      let ref: string | undefined;
      try {
        const json = JSON.parse(text) as Record<string, unknown>;
        const id = json["id"] ?? json["ref"];
        ref = typeof id === "string" ? id : String(id ?? "");
      } catch {
        ref =
          res.headers.get("x-request-id")   ??
          res.headers.get("x-reference-id")  ??
          undefined;
      }

      return {
        ok:          true,
        externalRef: ref || undefined,
        summary:     `CRM action executed: ${req.payload.action}`,
        payload:     { response: text.slice(0, 2000) },
      };

    } catch (err: unknown) {
      const msg       = err instanceof Error ? err.message : "unknown error";
      const isTimeout = err instanceof Error && err.name === "AbortError";
      return {
        ok:      false,
        summary: isTimeout ? "CRM request timed out" : "CRM request failed",
        error:   msg,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
