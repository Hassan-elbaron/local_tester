import { Link } from "wouter";

const FLOWS = [
  {
    name:         "Brand Audit",
    route:        "/brand-audit",
    router:       "brandAudit.run",
    proposalType: "research",
    description:  "Assess brand positioning, messaging gaps, audience clarity, risks, and opportunities.",
  },
  {
    name:         "Strategy Generation",
    route:        "/strategy-flow",
    router:       "strategyFlow.run",
    proposalType: "strategy",
    description:  "Generate a full strategic marketing plan: positioning, channels, acquisition, retention, 90-day actions.",
  },
  {
    name:         "Campaign Launch",
    route:        "/campaign-launch",
    router:       "campaignLaunch.run",
    proposalType: "campaign",
    description:  "Plan a campaign launch: targeting, channel mix, budget logic, messaging, execution approval.",
  },
  {
    name:         "Content Calendar",
    route:        "/content-calendar",
    router:       "contentCalendar.run",
    proposalType: "content",
    description:  "Build a content calendar plan: pillars, cadence, themes, channel-specific recommendations.",
  },
  {
    name:         "Optimization Loop",
    route:        "/optimization-loop",
    router:       "optimizationLoop.run",
    proposalType: "optimization",
    description:  "Diagnose performance bottlenecks and generate experiment + conversion improvement recommendations.",
  },
] as const;

export default function FlowsIndexPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-lg font-semibold">Business Flows</h1>
      <p className="text-sm text-muted-foreground">
        All flows run through the orchestrator, agents, memory, and autonomy policy.
        Results are saved to /runs. Approvals surface in /brain-approvals.
      </p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-medium">Flow</th>
            <th className="text-left p-2 font-medium">proposalType</th>
            <th className="text-left p-2 font-medium">Description</th>
            <th className="text-left p-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {FLOWS.map((f) => (
            <tr key={f.route} className="border-b hover:bg-muted/40">
              <td className="p-2 font-medium whitespace-nowrap">{f.name}</td>
              <td className="p-2 text-xs font-mono text-muted-foreground">{f.proposalType}</td>
              <td className="p-2 text-xs text-muted-foreground">{f.description}</td>
              <td className="p-2">
                <Link
                  href={f.route}
                  className="px-3 py-1 text-xs border rounded hover:bg-muted"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
