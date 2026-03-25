/**
 * Skills Hub — Skills, Plugins, Agents, and Ideas Management
 * Full control over what is enabled/disabled in the system
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Puzzle, Brain, Wrench, Lightbulb, CheckCircle, XCircle,
  Clock, Plus, RefreshCw, Loader2, Star, ToggleLeft, ToggleRight,
  ExternalLink, Search,
} from "lucide-react";

type Section = "skills" | "agents";

const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  under_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  integrated: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  deprecated: "bg-slate-600/10 text-slate-500 border-slate-600/20",
};

const CATEGORY_COLORS: Record<string, string> = {
  seo: "bg-green-500/10 text-green-400",
  social_listening: "bg-pink-500/10 text-pink-400",
  analytics: "bg-blue-500/10 text-blue-400",
  content: "bg-purple-500/10 text-purple-400",
  crm: "bg-orange-500/10 text-orange-400",
  reporting: "bg-teal-500/10 text-teal-400",
  ux: "bg-violet-500/10 text-violet-400",
  ads: "bg-amber-500/10 text-amber-400",
  automation: "bg-indigo-500/10 text-indigo-400",
  other: "bg-slate-500/10 text-slate-400",
};

function SkillCard({ skill, onRefresh }: { skill: any; onRefresh: () => void }) {
  const utils = trpc.useUtils();
  const valueScore = Number(skill.valueScore ?? 0);
  const complexityScore = Number(skill.complexityScore ?? 0);

  const approveMutation = trpc.learning.approveSkill.useMutation({
    onSuccess: () => { utils.learning.getSkills.invalidate(); onRefresh(); },
  });
  const rejectMutation = trpc.learning.rejectSkill.useMutation({
    onSuccess: () => { utils.learning.getSkills.invalidate(); onRefresh(); },
  });
  const integrateMutation = trpc.learning.markSkillIntegrated.useMutation({
    onSuccess: () => { utils.learning.getSkills.invalidate(); onRefresh(); },
  });

  const review = skill.aiReview as any;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
          <Puzzle className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-medium text-white text-sm">{skill.name}</h3>
            <Badge className={cn("text-xs border", STATUS_COLORS[skill.status] ?? "")}>
              {skill.status.replace("_", " ")}
            </Badge>
            <Badge className={cn("text-xs border-0", CATEGORY_COLORS[skill.category] ?? "bg-slate-500/10 text-slate-400")}>
              {skill.category.replace("_", " ")}
            </Badge>
          </div>
          {skill.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{skill.description}</p>
          )}
          {skill.sourceUrl && (
            <a href={skill.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-1">
              <ExternalLink className="w-3 h-3" /> Source
            </a>
          )}
        </div>

        {/* Scores */}
        <div className="flex-shrink-0 text-right space-y-1">
          {valueScore > 0 && (
            <div className="text-xs text-slate-400">
              Value: <span className="text-amber-400 font-medium">{valueScore.toFixed(1)}/10</span>
            </div>
          )}
          {complexityScore > 0 && (
            <div className="text-xs text-slate-400">
              Complexity: <span className="text-slate-300 font-medium">{complexityScore.toFixed(1)}/10</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Review */}
      {review?.recommendation && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
          <span className="font-medium text-slate-300">AI says:</span> {review.recommendation} —{" "}
          {review.integrationNotes ?? ""}
        </div>
      )}

      {/* Compatibility */}
      {skill.compatibilityNotes && (
        <p className="mt-2 text-xs text-slate-500 italic">{skill.compatibilityNotes}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
        {skill.status === "under_review" && (
          <>
            <Button size="sm" variant="outline"
              className="flex-1 h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={() => approveMutation.mutate({ skillId: skill.id })}
              disabled={approveMutation.isPending}
            >
              <CheckCircle className="w-3 h-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline"
              className="flex-1 h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => rejectMutation.mutate({ skillId: skill.id })}
              disabled={rejectMutation.isPending}
            >
              <XCircle className="w-3 h-3 mr-1" /> Reject
            </Button>
          </>
        )}
        {skill.status === "approved" && (
          <Button size="sm" variant="outline"
            className="h-7 text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            onClick={() => integrateMutation.mutate({ skillId: skill.id })}
            disabled={integrateMutation.isPending}
          >
            <CheckCircle className="w-3 h-3 mr-1" /> Mark Integrated
          </Button>
        )}
        <span className="text-xs text-slate-600 ml-auto self-center capitalize">
          {skill.implementationType?.replace("_", " ")}
        </span>
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: any }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
          <Brain className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white text-sm">{agent.name}</h3>
            <Badge className="text-xs bg-green-500/10 text-green-400 border-0">Active</Badge>
          </div>
          <p className="text-xs text-slate-400">{agent.role}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Weight: <span className="text-white font-medium">{agent.weight}×</span></div>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
        Participates in deliberation sessions with a weight factor of {agent.weight}. Part of the 15-agent consensus engine.
      </p>
    </div>
  );
}

function AddSkillForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("analytics");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [show, setShow] = useState(false);
  const utils = trpc.useUtils();

  const discoverMutation = trpc.learning.discoverSkill.useMutation({
    onSuccess: () => {
      setName(""); setDescription(""); setUrl(""); setShow(false);
      utils.learning.getSkills.invalidate();
      onAdded();
    },
  });

  if (!show) {
    return (
      <Button onClick={() => setShow(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-500 h-8 text-xs">
        <Plus className="w-3 h-3 mr-1" /> Add Skill
      </Button>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="font-medium text-white text-sm">Propose New Skill</h3>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Skill name" value={name} onChange={e => setName(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 text-sm" />
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-2 h-9">
          {["seo", "social_listening", "analytics", "content", "crm", "reporting", "ux", "ads", "automation", "other"].map(c => (
            <option key={c} value={c}>{c.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      <Input placeholder="Source URL (optional)" value={url} onChange={e => setUrl(e.target.value)}
        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 text-sm" />
      <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)}
        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 text-sm" />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShow(false)} variant="outline" className="h-8 text-xs flex-1">Cancel</Button>
        <Button size="sm"
          onClick={() => discoverMutation.mutate({ name, category: category as any, description: description || undefined, sourceUrl: url || undefined })}
          disabled={!name.trim() || discoverMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-500 h-8 text-xs flex-1"
        >
          {discoverMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wrench className="w-3 h-3 mr-1" />}
          {discoverMutation.isPending ? "AI Reviewing..." : "Propose & Review"}
        </Button>
      </div>
    </div>
  );
}

export default function SkillsHub() {
  const { currentCompany } = useCompany();
  const [section, setSection] = useState<Section>("skills");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);

  const { data: skills = [], isLoading: skillsLoading } = trpc.learning.getSkills.useQuery(
    { status: filter === "all" ? undefined : filter }
  );
  const { data: agents = [] } = trpc.deliberationEngine.getAgents.useQuery();
  const utils = trpc.useUtils();

  const scanMutation = trpc.learning.scanForNewSkills.useMutation({
    onSuccess: (r) => { utils.learning.getSkills.invalidate(); },
  });

  const filteredSkills = skills.filter((s: any) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.includes(search.toLowerCase())
  );

  const SECTIONS = [
    { id: "skills", label: "Skills & Plugins", icon: <Puzzle className="w-4 h-4" />, count: skills.length },
    { id: "agents", label: "Agent Registry", icon: <Brain className="w-4 h-4" />, count: agents.length },
  ] as const;

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Puzzle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Skills Hub</h1>
            <p className="text-sm text-slate-400">Manage skills, plugins, and agents — approve before enabling</p>
          </div>
        </div>

        {/* Nav */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id as Section)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                section === s.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              )}>
              {s.icon} {s.label}
              {s.count > 0 && <span className={cn("text-xs px-1.5 py-0.5 rounded-full", section === s.id ? "bg-white/20" : "bg-slate-800")}>{s.count}</span>}
            </button>
          ))}
        </div>

        {/* Skills Section */}
        {section === "skills" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills..."
                  className="pl-9 h-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm" />
              </div>
              <select value={filter} onChange={e => setFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-2 h-9">
                <option value="all">All status</option>
                {["discovered", "under_review", "approved", "rejected", "integrated"].map(s => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={() => scanMutation.mutate(undefined as any)}
                disabled={scanMutation.isPending}
                className="h-9 text-xs border-slate-700 text-slate-300 hover:text-white">
                {scanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Auto-Discover
              </Button>
              <AddSkillForm onAdded={() => setRefresh(r => r + 1)} />
            </div>

            {skillsLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading skills...
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="text-center py-16">
                <Puzzle className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                <p className="text-slate-500 text-sm">No skills yet. Click "Auto-Discover" or add one manually.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredSkills.map((skill: any) => (
                  <SkillCard key={skill.id} skill={skill} onRefresh={() => setRefresh(r => r + 1)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agents Section */}
        {section === "agents" && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
              These 15 agents participate in every deliberation session. Weight determines influence in consensus calculation.
              Agents cannot be individually disabled yet — they all participate in the two-pass deliberation engine.
            </div>
            <div className="grid gap-3">
              {(agents as any[]).map((agent: any) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
