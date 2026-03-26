/**
 * Meta Ads Execution Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a PAUSED campaign in the Meta Ads (Facebook) Graph API.
 * Returns the real campaign ID as externalRef.
 *
 * Required ENV:
 *   META_ACCESS_TOKEN   — long-lived system user access token
 *   META_AD_ACCOUNT_ID  — numeric ad account ID (without "act_" prefix)
 *
 * The campaign is created with status=PAUSED so nothing spends until
 * a human explicitly activates it in Meta Business Manager.
 */

import type { ExecutionAdapter, ExternalExecutionResult } from "../execution_receipts";
import type { BrainExecutionRequest } from "../orchestration_contract";

const META_API_VERSION = "v18.0";
const META_TIMEOUT_MS  = Number(process.env.META_ADS_TIMEOUT_MS ?? 15_000);

export class MetaAdsExecutionAdapter implements ExecutionAdapter {
  target = "meta_ads";

  canHandle(target: string): boolean {
    return target === "meta_ads";
  }

  async execute(req: BrainExecutionRequest): Promise<ExternalExecutionResult> {
    if (process.env.DEMO_MODE === "true") {
      return { ok: true, externalRef: "demo_meta_campaign_123", summary: "Demo: Meta campaign simulated", payload: { status: "PAUSED" } };
    }
    const token       = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    // ── Credential guard ──────────────────────────────────────────────────
    if (!token || !adAccountId) {
      return {
        ok:      false,
        summary: "Missing Meta Ads credentials",
        error:   "META_ACCESS_TOKEN or META_AD_ACCOUNT_ID not set in environment",
      };
    }

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), META_TIMEOUT_MS);

    try {
      const res = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/campaigns`,
        {
          method:  "POST",
          signal:  controller.signal,
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({
            name:      `AI Campaign ${req.taskId}`,
            objective: "OUTCOME_TRAFFIC",
            status:    "PAUSED",           // never spends without manual activation
            special_ad_categories: [],     // required field — empty = no restrictions
          }),
        },
      );

      // Cap response body to 4 KB to avoid memory blowout
      const raw  = await res.text();
      const body = raw.slice(0, 4096);

      let json: Record<string, unknown> = {};
      try { json = JSON.parse(body); } catch { /* leave as empty object */ }

      if (!res.ok) {
        return {
          ok:      false,
          summary: `Meta Ads API error (HTTP ${res.status})`,
          error:   body,
        };
      }

      const campaignId = typeof json["id"] === "string" ? json["id"] : String(json["id"] ?? "");

      return {
        ok:          true,
        externalRef: campaignId,
        summary:     `Meta campaign created (PAUSED) — id: ${campaignId}`,
        payload:     json,
      };

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      const isTimeout = msg.toLowerCase().includes("abort");
      return {
        ok:      false,
        summary: isTimeout ? "Meta Ads request timed out" : "Meta Ads request failed",
        error:   msg,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
