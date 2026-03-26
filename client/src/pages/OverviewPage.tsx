import { Link } from "wouter";

// ── Section data ──────────────────────────────────────────────────────────────
const CAPABILITIES = [
  {
    title: "Multi-Agent Deliberation",
    description:
      "Every decision runs through a panel of 13 specialist AI agents (Strategy, Campaign, Analytics, Compliance, Budget, Research, Futurist, and more). Agents deliberate in rounds: Proposal → Critique → Revision → Scoring → Final. Dissent is surfaced explicitly — no silent overrides.",
  },
  {
    title: "Human-in-the-Loop by Design",
    description:
      "The system has 5 autonomy levels (L1–L5). Most actions require human approval before execution (L3). Only low-risk optimization tasks with high confidence auto-execute (L4). No action escapes the audit log.",
  },
  {
    title: "Real External Execution",
    description:
      "Decisions don't stop at recommendations. The system executes via typed adapters: Meta Ads (campaign launch), CMS (content drafts), CRM (lead creation), SendGrid (email sequences), and generic Webhooks (optimization directives). Every execution produces a signed receipt.",
  },
  {
    title: "Persistent Memory & Learning",
    description:
      "After every run, the system writes structured memories: what it decided, why, and what happened. Over time, learnings feed back into future deliberations, making the system incrementally smarter per company.",
  },
  {
    title: "Full Observability",
    description:
      "Every agent opinion, every deliberation round, every execution receipt, every memory write is logged and queryable. System health, connector status, and agent performance are visible in real-time.",
  },
];

const FLOWS = [
  { name: "Brand Audit",        path: "/brand-audit",       type: "research",     autonomy: "L2", exec: "Internal" },
  { name: "Strategy Generation",path: "/strategy-flow",     type: "strategy",     autonomy: "L2", exec: "Internal" },
  { name: "Campaign Launch",    path: "/campaign-launch",   type: "campaign",     autonomy: "L3", exec: "Meta Ads API" },
  { name: "Content Calendar",   path: "/content-calendar",  type: "content",      autonomy: "L3", exec: "CMS Connector" },
  { name: "Optimization Loop",  path: "/optimization-loop", type: "optimization", autonomy: "L4", exec: "Webhook" },
];

const INTEGRATIONS = [
  { name: "Meta Ads",   status: "live",    note: "Campaign creation via Graph API v18.0" },
  { name: "SendGrid",   status: "live",    note: "Transactional + campaign email via v3 API" },
  { name: "CRM Bridge", status: "live",    note: "Webhook-first connector (HubSpot / Salesforce / Pipedrive)" },
  { name: "CMS Bridge", status: "live",    note: "Webhook-first connector (WordPress / Contentful / Ghost / Strapi)" },
  { name: "Webhook",    status: "live",    note: "Generic signed connector for any HTTP endpoint" },
  { name: "Google Ads", status: "planned", note: "Search + Display campaign execution" },
  { name: "Slack",      status: "planned", note: "Approval notifications + status updates" },
  { name: "Analytics",  status: "planned", note: "GA4 / Mixpanel performance ingestion" },
];

const CONSOLE_SCREENS = [
  { label: "Run History",        path: "/runs",              desc: "Full deliberation trace for every brain run" },
  { label: "Approval Queue",     path: "/brain-approvals",   desc: "L3 tasks awaiting human approval" },
  { label: "Executions",         path: "/executions",        desc: "External execution receipts with adapter refs" },
  { label: "Memory",             path: "/memory",            desc: "Structured memories written per company" },
  { label: "Observability",      path: "/observability",     desc: "System health, connectors, agent performance" },
  { label: "Business Flows",     path: "/flows",             desc: "All 5 flows with input forms" },
];

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded font-mono ${color}`}>
      {children}
    </span>
  );
}

function statusColor(s: string) {
  if (s === "live")    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (s === "planned") return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
  return "";
}

function autonomyColor(l: string) {
  if (l === "L2") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (l === "L3") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-600";
  if (l === "L4") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  return "";
}

export default function OverviewPage() {
  return (
    <div className="p-6 space-y-10 max-w-4xl">

      {/* ── Hero ── */}
      <div className="space-y-3 border-b pb-8">
        <h1 className="text-2xl font-bold tracking-tight">AI Marketing Brain OS</h1>
        <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
          A multi-agent marketing operating system that deliberates, decides, and executes
          marketing actions across strategy, campaigns, content, and optimization —
          with full human oversight, complete audit trails, and real external integrations.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge color="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">13 AI Agents</Badge>
          <Badge color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">5 Business Flows</Badge>
          <Badge color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">5 Live Integrations</Badge>
          <Badge color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Human-in-the-Loop</Badge>
          <Badge color="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">Full Observability</Badge>
        </div>
      </div>

      {/* ── Not a chatbot ── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">This is not a chatbot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ["Chatbot", "Responds to prompts. No memory. No execution. No audit."],
            ["AI Marketing Brain OS", "Deliberates across 13 agents, decides with confidence scores, executes via real APIs, writes persistent memory, logs everything."],
          ].map(([label, desc]) => (
            <div key={label} className="border rounded p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Capabilities ── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Core Capabilities</h2>
        <div className="space-y-3">
          {CAPABILITIES.map(c => (
            <div key={c.title} className="border rounded p-4 space-y-1">
              <p className="text-sm font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Business Flows ── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Business Flows</h2>
        <p className="text-xs text-muted-foreground">
          Each flow is a full pipeline: form input → multi-agent deliberation → decision → execution → memory write.
        </p>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Flow</th>
                <th className="text-left p-3 font-medium">Task Type</th>
                <th className="text-left p-3 font-medium">Autonomy</th>
                <th className="text-left p-3 font-medium">Execution Target</th>
              </tr>
            </thead>
            <tbody>
              {FLOWS.map((f, i) => (
                <tr key={f.path} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="p-3">
                    <Link href={f.path} className="text-blue-600 underline text-xs font-medium">{f.name}</Link>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-xs">{f.type}</span>
                  </td>
                  <td className="p-3">
                    <Badge color={autonomyColor(f.autonomy)}>{f.autonomy}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{f.exec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p><span className="font-medium">L2</span> — Recommendation only. No execution gate.</p>
          <p><span className="font-medium">L3</span> — Requires explicit human approval before execution.</p>
          <p><span className="font-medium">L4</span> — Auto-executes when confidence ≥ 80% and risk ≤ 35%.</p>
        </div>
      </div>

      {/* ── Integrations ── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Integrations</h2>
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Integration</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {INTEGRATIONS.map((ig, i) => (
                <tr key={ig.name} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="p-3 font-medium text-sm">{ig.name}</td>
                  <td className="p-3">
                    <Badge color={statusColor(ig.status)}>{ig.status}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{ig.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Operations Console ── */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Operations Console</h2>
        <p className="text-xs text-muted-foreground">
          Full visibility into every decision, execution, and memory state — in real-time.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONSOLE_SCREENS.map(s => (
            <Link key={s.path} href={s.path} className="border rounded p-4 space-y-1 hover:bg-muted/30 transition-colors block">
              <p className="text-sm font-medium text-blue-600 underline">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Demo CTA ── */}
      <div className="border rounded p-5 bg-muted/20 space-y-3">
        <h2 className="text-base font-semibold">See it in action</h2>
        <p className="text-xs text-muted-foreground">
          The <strong>/demo</strong> page runs all 5 flows end-to-end using Demo Coffee as sample brand.
          No API keys required — all external integrations are simulated.
        </p>
        <Link
          href="/demo"
          className="inline-block px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded"
        >
          Open Demo →
        </Link>
      </div>

    </div>
  );
}
