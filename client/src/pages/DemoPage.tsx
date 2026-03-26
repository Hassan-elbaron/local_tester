import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

// ── Fixed demo company (companyId=1 must exist in DB) ────────────────────────
const DEMO_COMPANY_ID = 1;

const DEMO_BRAND = {
  brandName:        "Demo Coffee",
  industry:         "Specialty Coffee",
  businessGoal:     "Increase online sales by 50% in Q2",
  campaignGoal:     "Drive traffic to new seasonal product line",
  contentGoal:      "Increase LinkedIn + Instagram engagement",
  optimizationGoal: "Improve checkout conversion rate from 1.8% to 4%",
};

// ── Result shape shared across all flows ─────────────────────────────────────
type FlowResult = {
  taskId:       string | null;
  decision:     { recommendation?: string; confidence?: number; riskScore?: number; status?: string } | null;
  execution:    { status?: string; externalRef?: string; summary?: string } | null;
  guardBlocked: { guard: string; reason: string } | null;
};

type StepKey = "audit" | "strategy" | "campaign" | "content" | "optimization";

const STEPS: { key: StepKey; label: string; description: string }[] = [
  { key: "audit",        label: "1. Brand Audit",          description: "Assess brand positioning, audience clarity, and messaging gaps." },
  { key: "strategy",     label: "2. Strategy Generation",  description: "Generate a full strategic marketing plan with 30/60/90-day actions." },
  { key: "campaign",     label: "3. Campaign Launch",       description: "Plan and launch a campaign via Meta Ads (simulated in demo)." },
  { key: "content",      label: "4. Content Calendar",      description: "Build a content plan and push a draft to CMS (simulated in demo)." },
  { key: "optimization", label: "5. Optimization Loop",     description: "Diagnose performance bottlenecks and auto-execute optimizations." },
];

// ── Confidence colour ─────────────────────────────────────────────────────────
function confColor(v?: number) {
  if (v == null) return "";
  if (v >= 0.75) return "text-green-600";
  if (v >= 0.5)  return "text-yellow-600";
  return "text-red-600";
}

function statusColor(s?: string) {
  if (s === "completed") return "text-green-600 font-medium";
  if (s === "failed")    return "text-red-600 font-medium";
  if (s === "blocked")   return "text-yellow-600 font-medium";
  return "text-muted-foreground";
}

export default function DemoPage() {
  const [results,  setResults]  = useState<Partial<Record<StepKey, FlowResult>>>({});
  const [loading,  setLoading]  = useState<Partial<Record<StepKey, boolean>>>({});
  const [errors,   setErrors]   = useState<Partial<Record<StepKey, string>>>({});

  const auditRun    = trpc.brandAudit.run.useMutation();
  const strategyRun = trpc.strategyFlow.run.useMutation();
  const campaignRun = trpc.campaignLaunch.run.useMutation();
  const contentRun  = trpc.contentCalendar.run.useMutation();
  const optRun      = trpc.optimizationLoop.run.useMutation();

  async function runStep(key: StepKey) {
    setLoading(p => ({ ...p, [key]: true }));
    setErrors(p => ({ ...p, [key]: undefined }));
    setResults(p => ({ ...p, [key]: undefined }));

    try {
      let raw: FlowResult;
      const cid = DEMO_COMPANY_ID;

      if (key === "audit") {
        raw = await auditRun.mutateAsync({
          companyId: cid, brandName: DEMO_BRAND.brandName,
          industry: DEMO_BRAND.industry, notes: "Full demo run",
        }) as FlowResult;
      } else if (key === "strategy") {
        raw = await strategyRun.mutateAsync({
          companyId: cid, brandName: DEMO_BRAND.brandName,
          industry: DEMO_BRAND.industry, businessGoal: DEMO_BRAND.businessGoal,
        }) as FlowResult;
      } else if (key === "campaign") {
        raw = await campaignRun.mutateAsync({
          companyId: cid, brandName: DEMO_BRAND.brandName,
          campaignGoal: DEMO_BRAND.campaignGoal,
          channels: "LinkedIn Ads, Facebook Ads",
          budget: "$3,000 total",
          audience: "Coffee enthusiasts 25-45",
        }) as FlowResult;
      } else if (key === "content") {
        raw = await contentRun.mutateAsync({
          companyId: cid, brandName: DEMO_BRAND.brandName,
          contentGoal: DEMO_BRAND.contentGoal,
          channels: "LinkedIn, Instagram",
          contentPillars: "Education, Behind-the-Scenes, Product, Culture",
          postingFrequency: "5x/week",
        }) as FlowResult;
      } else {
        raw = await optRun.mutateAsync({
          companyId: cid, brandName: DEMO_BRAND.brandName,
          optimizationGoal: DEMO_BRAND.optimizationGoal,
          currentPerformance: "CVR 1.8%, 140 orders/month, 65% cart abandonment",
          bottlenecks: "Checkout has 6 steps, no trust badges, slow mobile load",
        }) as FlowResult;
      }

      setResults(p => ({ ...p, [key]: raw }));
    } catch (e: unknown) {
      setErrors(p => ({ ...p, [key]: e instanceof Error ? e.message : "Unknown error" }));
    } finally {
      setLoading(p => ({ ...p, [key]: false }));
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold">Demo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          End-to-end demo using <strong>Demo Coffee</strong> as sample brand.
          All external integrations are simulated (DEMO_MODE active).
        </p>
      </div>

      {STEPS.map(({ key, label, description }) => {
        const res  = results[key];
        const busy = loading[key];
        const err  = errors[key];

        return (
          <div key={key} className="border rounded p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <button
                onClick={() => runStep(key)}
                disabled={!!busy}
                className="shrink-0 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded disabled:opacity-50"
              >
                {busy ? "Running…" : "Run"}
              </button>
            </div>

            {/* Error */}
            {err && <p className="text-xs text-red-500">{err}</p>}

            {/* Result */}
            {res && (
              <div className="space-y-2 text-sm border-t pt-3">
                {/* Decision summary */}
                <div className="space-y-1">
                  {res.decision?.recommendation && (
                    <div>
                      <span className="text-xs text-muted-foreground">Decision: </span>
                      <span className="font-medium capitalize">{res.decision.recommendation}</span>
                    </div>
                  )}
                  {res.decision?.confidence != null && (
                    <div>
                      <span className="text-xs text-muted-foreground">Confidence: </span>
                      <span className={`text-xs ${confColor(res.decision.confidence)}`}>
                        {Math.round(res.decision.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Execution summary */}
                <div className="space-y-1">
                  <div>
                    <span className="text-xs text-muted-foreground">Execution: </span>
                    <span className={`text-xs ${statusColor(res.execution?.status)}`}>
                      {res.execution?.status ?? "—"}
                    </span>
                  </div>
                  {res.execution?.externalRef && (
                    <div>
                      <span className="text-xs text-muted-foreground">Ref: </span>
                      <span className="text-xs font-mono">{res.execution.externalRef}</span>
                    </div>
                  )}
                  {res.execution?.summary && (
                    <div className="text-xs text-muted-foreground">{res.execution.summary}</div>
                  )}
                </div>

                {/* Guard blocked */}
                {res.guardBlocked && (
                  <div className="text-xs text-yellow-700">
                    Blocked: {res.guardBlocked.reason}
                  </div>
                )}

                {/* View Full Run */}
                {res.taskId && (
                  <Link
                    href={`/runs/${res.taskId}`}
                    className="inline-block text-xs text-blue-600 underline mt-1"
                  >
                    View Full Run →
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer links */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p>After running flows, explore the full system:</p>
        <div className="flex flex-wrap gap-3">
          {["/runs", "/brain-approvals", "/executions", "/memory", "/observability", "/flows"].map(r => (
            <Link key={r} href={r} className="text-blue-600 underline">{r}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
