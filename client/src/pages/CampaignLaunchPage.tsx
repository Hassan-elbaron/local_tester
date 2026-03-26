import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Link } from "wouter";

type CampaignResult = {
  proposalId: number;
  taskId: string | null;
  decision: Record<string, unknown> | null;
  deliberation: {
    id: number;
    finalRecommendation: string;
    consensusScore: number;
    escalated: boolean;
    selectedAgents: string[];
    dissentSummary: { agentRole: string; concern: string }[];
  };
  memoryWrites: unknown[];
  execution: Record<string, unknown> | null;
  guardBlocked: { guard: string; reason: string } | null;
};

type Section = "decision" | "deliberation" | "memory" | "execution";

export default function CampaignLaunchPage() {
  const { currentCompany } = useCompany();

  const [brandName,     setBrandName]     = useState("");
  const [campaignGoal,  setCampaignGoal]  = useState("");
  const [offer,         setOffer]         = useState("");
  const [audience,      setAudience]      = useState("");
  const [channels,      setChannels]      = useState("");
  const [budget,        setBudget]        = useState("");
  const [timeline,      setTimeline]      = useState("");
  const [landingPage,   setLandingPage]   = useState("");
  const [notes,         setNotes]         = useState("");

  const [result,  setResult]  = useState<CampaignResult | null>(null);
  const [section, setSection] = useState<Section>("decision");

  const run = trpc.campaignLaunch.run.useMutation({
    onSuccess: (data) => setResult(data as CampaignResult),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany) return;
    setResult(null);
    run.mutate({
      companyId:    currentCompany.id,
      brandName:    brandName.trim(),
      campaignGoal: campaignGoal.trim(),
      offer:        offer.trim()        || undefined,
      audience:     audience.trim()     || undefined,
      channels:     channels.trim()     || undefined,
      budget:       budget.trim()       || undefined,
      timeline:     timeline.trim()     || undefined,
      landingPage:  landingPage.trim()  || undefined,
      notes:        notes.trim()        || undefined,
    });
  }

  if (!currentCompany) {
    return <div className="p-6 text-sm text-muted-foreground">No company selected.</div>;
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <h1 className="text-lg font-semibold">Campaign Launch</h1>

      {/* ── Form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium">Brand Name *</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g. Acme Corp"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Campaign Goal *</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            value={campaignGoal}
            onChange={(e) => setCampaignGoal(e.target.value)}
            placeholder="e.g. Generate 500 leads in 30 days"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Offer</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder="e.g. Free trial, 20% discount, lead magnet"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Audience</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. SMB owners, age 30-50, interested in SaaS tools"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Channels</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            value={channels}
            onChange={(e) => setChannels(e.target.value)}
            placeholder="e.g. LinkedIn Ads, Email, Google Search"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Budget</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. $5,000 total / $500/week"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Timeline</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="e.g. Launch April 1, run 30 days"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Landing Page</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            value={landingPage}
            onChange={(e) => setLandingPage(e.target.value)}
            placeholder="e.g. https://example.com/offer"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Notes</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm bg-background resize-none"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any constraints, priorities, or context..."
          />
        </div>

        <button
          type="submit"
          disabled={run.isPending || !brandName.trim() || !campaignGoal.trim()}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          {run.isPending ? "Planning Campaign…" : "Launch Campaign Plan"}
        </button>

        {run.error && (
          <p className="text-sm text-red-500">{run.error.message}</p>
        )}
      </form>

      {/* ── Results ──────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold">Campaign Plan Ready</h2>
            {result.taskId && (
              <Link
                href={`/runs/${result.taskId}`}
                className="text-xs text-blue-600 underline"
              >
                View in /runs →
              </Link>
            )}
          </div>

          {result.guardBlocked && (
            <div className="text-sm text-yellow-700 border border-yellow-300 rounded p-3 bg-yellow-50">
              Blocked by guard <strong>{result.guardBlocked.guard}</strong>: {result.guardBlocked.reason}
            </div>
          )}

          {/* Section tabs */}
          <div className="flex gap-2 text-xs flex-wrap">
            {(["decision", "deliberation", "memory", "execution"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`px-3 py-1 rounded border ${
                  section === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border"
                }`}
              >
                {s === "decision"      ? "Decision"
                : s === "deliberation" ? "Deliberation"
                : s === "memory"       ? "Memory Writes"
                : "Execution"}
              </button>
            ))}
          </div>

          {/* Decision */}
          {section === "decision" && (
            <div>
              {result.decision ? (
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[500px] whitespace-pre-wrap">
                  {JSON.stringify(result.decision, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No decision data.</p>
              )}
            </div>
          )}

          {/* Deliberation */}
          {section === "deliberation" && (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Recommendation: </span>
                <span className="font-medium">{result.deliberation.finalRecommendation || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Consensus Score: </span>
                <span>{(result.deliberation.consensusScore * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Escalated: </span>
                <span className={result.deliberation.escalated ? "text-yellow-600 font-medium" : "text-green-600"}>
                  {result.deliberation.escalated ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Agents: </span>
                <span>{result.deliberation.selectedAgents.join(", ") || "—"}</span>
              </div>
              {result.deliberation.dissentSummary.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1">Dissents:</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {result.deliberation.dissentSummary.map((d, i) => (
                      <li key={i}>
                        <strong>{d.agentRole}</strong>: {d.concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">Raw JSON</summary>
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[400px] mt-2 whitespace-pre-wrap">
                  {JSON.stringify(result.deliberation, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Memory Writes */}
          {section === "memory" && (
            <div>
              {result.memoryWrites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No memory writes.</p>
              ) : (
                <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[500px] whitespace-pre-wrap">
                  {JSON.stringify(result.memoryWrites, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Execution */}
          {section === "execution" && (
            <div>
              {result.execution ? (
                <>
                  {(result.execution as Record<string, unknown>).status === "blocked" && (
                    <p className="text-xs text-yellow-700 mb-2 font-medium">
                      Execution blocked — pending approval or guard. Check /brain-approvals.
                    </p>
                  )}
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-[500px] whitespace-pre-wrap">
                    {JSON.stringify(result.execution, null, 2)}
                  </pre>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No execution data.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
