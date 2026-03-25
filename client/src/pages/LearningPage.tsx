/**
 * Learning & Teaching Page
 * Add external ideas, links, files → AI reviews → Human approves → System learns
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BookOpen, Plus, Link2, FileText, Github, Wrench, Globe,
  CheckCircle, XCircle, Clock, Sparkles, ChevronDown, ChevronUp,
  Loader2, Star, AlertTriangle, Zap,
} from "lucide-react";

const SOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
  github_repo: <Github className="w-3.5 h-3.5" />,
  article: <FileText className="w-3.5 h-3.5" />,
  tool: <Wrench className="w-3.5 h-3.5" />,
  workflow: <Zap className="w-3.5 h-3.5" />,
  doc: <BookOpen className="w-3.5 h-3.5" />,
  example: <Sparkles className="w-3.5 h-3.5" />,
  plugin: <Globe className="w-3.5 h-3.5" />,
  other: <Link2 className="w-3.5 h-3.5" />,
};

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  deferred: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  implemented: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const AI_SUGGESTION_COLORS: Record<string, string> = {
  accept: "text-green-400",
  reject: "text-red-400",
  defer: "text-amber-400",
};

function IdeaCard({ idea, companyId, onReview }: {
  idea: any;
  companyId?: number;
  onReview: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();

  const reviewMutation = trpc.learning.reviewIdea.useMutation({
    onSuccess: () => {
      utils.learning.getIdeas.invalidate();
      onReview();
    },
  });

  const usefulnessScore = Number(idea.usefulnessScore ?? 0);
  const stars = Math.round(usefulnessScore / 2);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-700">
          {SOURCE_TYPE_ICONS[idea.sourceType] ?? <Link2 className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-medium text-white text-sm leading-tight">{idea.title}</h3>
            <Badge className={cn("text-xs border", STATUS_COLORS[idea.status] ?? "")}>
              {idea.status.replace("_", " ")}
            </Badge>
          </div>
          {idea.sourceUrl && (
            <a href={idea.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 truncate block mt-0.5">
              {idea.sourceUrl}
            </a>
          )}
        </div>

        {/* AI Score */}
        <div className="flex-shrink-0 text-right">
          {usefulnessScore > 0 && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("w-3 h-3", i < stars ? "text-amber-400 fill-amber-400" : "text-slate-600")} />
              ))}
            </div>
          )}
          {idea.aiSuggestion && (
            <span className={cn("text-xs font-medium capitalize", AI_SUGGESTION_COLORS[idea.aiSuggestion] ?? "text-slate-400")}>
              AI: {idea.aiSuggestion}
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {idea.summary && (
        <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-2">{idea.summary}</p>
      )}

      {/* Expand */}
      {(idea.aiReasoning || idea.whereToUse || idea.risks?.length) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mt-2 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Less" : "AI Analysis"}
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-2 pt-3 border-t border-slate-800">
          {idea.whereToUse && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">Where to use:</p>
              <p className="text-xs text-slate-300">{idea.whereToUse}</p>
            </div>
          )}
          {idea.aiReasoning && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-1">AI reasoning:</p>
              <p className="text-xs text-slate-300">{idea.aiReasoning}</p>
            </div>
          )}
          {idea.risks?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Risks:
              </p>
              <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
                {idea.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Complexity:</span>
            <Badge variant="outline" className="text-xs">{idea.complexity}</Badge>
          </div>
        </div>
      )}

      {/* Actions — only for pending_review */}
      {idea.status === "pending_review" && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-800">
          <Button size="sm" variant="outline"
            className="flex-1 h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
            onClick={() => reviewMutation.mutate({ ideaId: idea.id, decision: "approved", companyId })}
            disabled={reviewMutation.isPending}
          >
            <CheckCircle className="w-3 h-3 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="outline"
            className="flex-1 h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={() => reviewMutation.mutate({ ideaId: idea.id, decision: "deferred", companyId })}
            disabled={reviewMutation.isPending}
          >
            <Clock className="w-3 h-3 mr-1" /> Defer
          </Button>
          <Button size="sm" variant="outline"
            className="flex-1 h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => reviewMutation.mutate({ ideaId: idea.id, decision: "rejected", companyId })}
            disabled={reviewMutation.isPending}
          >
            <XCircle className="w-3 h-3 mr-1" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

function AddIdeaForm({ companyId, onAdded }: { companyId?: number; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [sourceType, setSourceType] = useState<string>("article");
  const [scope, setScope] = useState<"global" | "company">("global");
  const utils = trpc.useUtils();

  const addMutation = trpc.learning.addIdea.useMutation({
    onSuccess: () => {
      setTitle(""); setUrl(""); setContent("");
      utils.learning.getIdeas.invalidate();
      onAdded();
    },
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <h3 className="font-medium text-white text-sm flex items-center gap-2">
        <Plus className="w-4 h-4 text-indigo-400" /> Add New Idea / Resource
      </h3>

      <Input
        placeholder="Title or description"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 text-sm"
      />

      <div className="flex gap-2">
        <Input
          placeholder="URL (optional)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9 text-sm"
        />
        <select
          value={sourceType}
          onChange={e => setSourceType(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-2 h-9 focus:outline-none focus:border-indigo-500"
        >
          {["article", "tool", "github_repo", "workflow", "doc", "example", "plugin", "other"].map(t => (
            <option key={t} value={t}>{t.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      <Textarea
        placeholder="Paste content, notes, or description (optional — helps AI review)"
        value={content}
        onChange={e => setContent(e.target.value)}
        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm min-h-[70px] resize-none"
        rows={3}
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["global", "company"] as const).map(s => (
            <button key={s}
              onClick={() => setScope(s)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors capitalize",
                scope === s
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
              )}
            >
              {s === "global" ? "Global Knowledge" : "Company-Specific"}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={() => addMutation.mutate({
            title,
            sourceUrl: url || undefined,
            rawContent: content || undefined,
            sourceType: sourceType as any,
            companyId: scope === "company" ? companyId : undefined,
          })}
          disabled={!title.trim() || addMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-500 h-8 text-xs"
        >
          {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
          {addMutation.isPending ? "AI Reviewing..." : "Add & Review"}
        </Button>
      </div>
    </div>
  );
}

export default function LearningPage() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [filter, setFilter] = useState<"all" | "pending_review" | "approved" | "rejected" | "implemented">("all");
  const [scope, setScope] = useState<"all" | "global" | "company">("all");
  const [refresh, setRefresh] = useState(0);

  const { data: ideas = [], isLoading } = trpc.learning.getIdeas.useQuery(
    { companyId: scope === "company" ? companyId : undefined },
    { enabled: true }
  );

  const filtered = ideas.filter((idea: any) =>
    filter === "all" ? true : idea.status === filter
  );

  const counts = {
    all: ideas.length,
    pending_review: ideas.filter((i: any) => i.status === "pending_review").length,
    approved: ideas.filter((i: any) => i.status === "approved").length,
    rejected: ideas.filter((i: any) => i.status === "rejected").length,
    implemented: ideas.filter((i: any) => i.status === "implemented").length,
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Learning & Teaching</h1>
            <p className="text-sm text-slate-400">Add ideas, links, and resources — AI reviews, you approve</p>
          </div>
        </div>

        {/* Add form */}
        <AddIdeaForm companyId={companyId} onAdded={() => setRefresh(r => r + 1)} />

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {(["all", "pending_review", "approved", "rejected", "implemented"] as const).map(f => (
              <button key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                  filter === f ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                {f.replace("_", " ")} {counts[f] > 0 && <span className="ml-1 opacity-70">({counts[f]})</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-1 ml-auto">
            {(["all", "global", "company"] as const).map(s => (
              <button key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors capitalize",
                  scope === s
                    ? "bg-slate-700 border-slate-600 text-white"
                    : "border-slate-800 text-slate-500 hover:text-white"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Ideas list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            <p className="text-slate-500 text-sm">No ideas yet. Add a link or resource above to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((idea: any) => (
              <IdeaCard key={idea.id} idea={idea} companyId={companyId} onReview={() => setRefresh(r => r + 1)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
