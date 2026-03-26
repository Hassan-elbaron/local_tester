import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";

const STATUS_CLASS: Record<string, string> = {
  completed: "text-green-600",
  failed:    "text-red-600",
  blocked:   "text-yellow-600",
  planned:   "text-muted-foreground",
  running:   "text-blue-600",
};

const HEALTH_CLASS: Record<string, string> = {
  healthy:  "text-green-600",
  warning:  "text-yellow-600",
  critical: "text-red-600",
};

export default function ObservabilityPage() {
  const { currentCompany } = useCompany();
  const cid = currentCompany?.id ?? 0;
  const enabled = !!currentCompany;

  const health      = trpc.observability.health.useQuery({ companyId: cid }, { enabled });
  const connectors  = trpc.observability.connectors.useQuery({ companyId: cid }, { enabled });
  const agents      = trpc.observability.agents.useQuery({ companyId: cid }, { enabled });
  const performance = trpc.observability.agentPerformance.useQuery({ companyId: cid }, { enabled });

  if (!currentCompany) {
    return <div className="p-6 text-sm text-muted-foreground">No company selected.</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-lg font-semibold">Observability</h1>

      {/* ── (A) System Health ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-medium mb-3">System Health (last 24h)</h2>

        {health.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {health.error   && <p className="text-sm text-red-500">{health.error.message}</p>}

        {health.data && (
          <div className="space-y-3">
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Health Status: </span>
                <span className={`font-semibold ${HEALTH_CLASS[health.data.health] ?? ""}`}>
                  {health.data.health.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Brain Runs: </span>
                <span>{health.data.totals.brainRuns}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Failed Executions: </span>
                <span className={health.data.totals.failedExecutions > 0 ? "text-red-600 font-medium" : ""}>
                  {health.data.totals.failedExecutions}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Blocked Executions: </span>
                <span className={health.data.totals.blockedExecutions > 3 ? "text-yellow-600 font-medium" : ""}>
                  {health.data.totals.blockedExecutions}
                </span>
              </div>
            </div>

            {health.data.healthReasons.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                {health.data.healthReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ── (B) Latest Events ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-medium mb-3">Latest Events</h2>

        {health.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {health.data && (
          health.data.latestEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events in the last 24h.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">taskId</th>
                    <th className="text-left p-2 font-medium">actionType</th>
                    <th className="text-left p-2 font-medium">status</th>
                    <th className="text-left p-2 font-medium">executor</th>
                    <th className="text-left p-2 font-medium">createdAt</th>
                  </tr>
                </thead>
                <tbody>
                  {health.data.latestEvents.map((ev) => (
                    <tr key={ev.id} className="border-b hover:bg-muted/40">
                      <td className="p-2 font-mono text-xs max-w-[160px] truncate">{ev.taskId}</td>
                      <td className="p-2 text-xs">{ev.actionType}</td>
                      <td className={`p-2 text-xs font-medium ${STATUS_CLASS[ev.status] ?? ""}`}>
                        {ev.status}
                      </td>
                      <td className="p-2 text-xs">{ev.executor}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      {/* ── (C) Connectors ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-medium mb-3">Connectors</h2>

        {connectors.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {connectors.error     && <p className="text-sm text-red-500">{connectors.error.message}</p>}

        {connectors.data && (
          connectors.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connector data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">executor</th>
                    <th className="text-left p-2 font-medium">status</th>
                    <th className="text-left p-2 font-medium">total</th>
                  </tr>
                </thead>
                <tbody>
                  {connectors.data.map((c, i) => (
                    <tr key={i} className="border-b hover:bg-muted/40">
                      <td className="p-2 text-xs">{c.executor}</td>
                      <td className={`p-2 text-xs font-medium ${STATUS_CLASS[c.status] ?? ""}`}>
                        {c.status}
                      </td>
                      <td className="p-2 text-xs">{c.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      {/* ── (D) Agents ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-medium mb-3">Agents</h2>

        {/* Policy Usage */}
        <h3 className="text-xs font-medium text-muted-foreground mb-2">Policy Usage</h3>

        {agents.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {agents.error     && <p className="text-sm text-red-500">{agents.error.message}</p>}

        {agents.data && (
          Object.keys(agents.data).length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">No policy trace data yet.</p>
          ) : (
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">agentRole</th>
                    <th className="text-left p-2 font-medium">total</th>
                    <th className="text-left p-2 font-medium">local</th>
                    <th className="text-left p-2 font-medium">cloud</th>
                    <th className="text-left p-2 font-medium">cloudPct</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(agents.data).map((a) => (
                    <tr key={a.agentRole} className="border-b hover:bg-muted/40">
                      <td className="p-2 text-xs">{a.agentRole}</td>
                      <td className="p-2 text-xs">{a.total}</td>
                      <td className="p-2 text-xs">{a.local}</td>
                      <td className="p-2 text-xs">{a.cloud}</td>
                      <td className="p-2 text-xs">{a.cloudPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Performance */}
        <h3 className="text-xs font-medium text-muted-foreground mb-2">Performance</h3>

        {performance.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {performance.error     && <p className="text-sm text-red-500">{performance.error.message}</p>}

        {performance.data && (
          performance.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No performance data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">agentRole</th>
                    <th className="text-left p-2 font-medium">participationCount</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.data.map((p) => (
                    <tr key={p.agentRole} className="border-b hover:bg-muted/40">
                      <td className="p-2 text-xs">{p.agentRole}</td>
                      <td className="p-2 text-xs">{p.deliberationCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>
    </div>
  );
}
