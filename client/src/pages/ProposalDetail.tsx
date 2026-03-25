import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/i18nContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  ArrowLeft, Brain, CheckCircle, XCircle, RefreshCw, Play,
  Star, AlertTriangle, Lightbulb, BarChart3,
  Zap, Shield, Clock, DollarSign, Target, Users, TrendingUp,
  FileText, Loader2, ChevronDown, ChevronUp, Calendar,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  proposed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  under_deliberation: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  pending_approval: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  needs_revision: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  revised: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  in_execution: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  archived: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

const AGENT_COLORS: Record<string, string> = {
  cmo: "#6366f1", paid_media_director: "#f59e0b", performance_marketing: "#10b981",
  creative_director: "#ec4899", copy_chief: "#8b5cf6", content_strategist: "#06b6d4",
  funnel_architect: "#f97316", crm_expert: "#84cc16", seo_strategist: "#14b8a6",
  data_analyst: "#3b82f6", competitor_analyst: "#ef4444", media_buyer: "#a855f7",
  qa_critic: "#64748b", orchestrator: "#f59e0b",
};

function ScoreBar({ label, value, max = 10, color = "bg-indigo-500" }: {
  label: string; value: number; max?: number; color?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function AgentOpinionCard({ opinion, expanded, onToggle }: {
  opinion: any; expanded: boolean; onToggle: () => void;
}) {
  const color = AGENT_COLORS[opinion.agentRole?.toLowerCase()] ?? "#6366f1";
  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 font-bold"
          style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40`, color }}
        >
          {opinion.votedFor ? "✓" : "✗"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{opinion.agentName ?? opinion.agentRole}</span>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0",
                opinion.votedFor ? "border-green-500/40 text-green-400" : "border-red-500/40 text-red-400"
              )}
            >
              {opinion.votedFor ? "Support" : "Oppose"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{opinion.recommendation}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-xs font-mono text-indigo-400">{((opinion.confidence ?? 0.7) * 100).toFixed(0)}%</div>
            <div className="text-[10px] text-muted-foreground">confidence</div>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">
          <div className="text-xs text-muted-foreground leading-relaxed">
            <Streamdown>{opinion.opinion ?? ""}</Streamdown>
          </div>
          {(opinion.concerns as string[] ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Concerns
              </p>
              <ul className="space-y-0.5">
                {(opinion.concerns as string[]).map((c: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-400/60 mt-0.5">•</span>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(opinion.suggestions as string[] ?? []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-400 mb-1 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Suggestions
              </p>
              <ul className="space-y-0.5">
                {(opinion.suggestions as string[]).map((s: string, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-green-400/60 mt-0.5">•</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OptionCard({ option, selected, onSelect }: { option: any; selected: boolean; onSelect: () => void }) {
  const scores = (option.scores as Record<string, number>) ?? {};
  return (
    <div
      onClick={onSelect}
      className={cn(
        "border rounded-xl p-4 cursor-pointer transition-all",
        selected ? "border-indigo-500/60 bg-indigo-500/10" : "border-white/10 hover:border-white/20 bg-white/5",
        option.isRecommended && "ring-1 ring-green-500/40"
      )}
    >
      {option.isRecommended && (
        <div className="flex items-center gap-1 text-green-400 text-xs font-medium mb-2">
          <Star className="w-3 h-3 fill-green-400" /> Recommended
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">{option.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{option.description}</p>
        </div>
        <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">#{option.optionIndex}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <ScoreBar label="ROI" value={scores.roi ?? 0} color="bg-green-500" />
        <ScoreBar label="Feasibility" value={scores.feasibility ?? 0} color="bg-blue-500" />
        <ScoreBar label="Risk" value={scores.risk ?? 0} color="bg-red-500" />
        <ScoreBar label="Speed" value={scores.speed ?? 0} color="bg-amber-500" />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" /><span>{option.estimatedTimeline ?? "TBD"}</span>
        {option.estimatedBudget && <><DollarSign className="w-3 h-3 ml-1" /><span>${Number(option.estimatedBudget).toLocaleString()}</span></>}
      </div>
      {(option.channels as string[] ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {(option.channels as string[]).slice(0, 4).map((ch: string) => (
            <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">{ch}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { currentCompany } = useCompany();
  const { t } = useI18n();
  const proposalId = Number(id);
  const companyId = currentCompany?.id ?? 0;
  const utils = trpc.useUtils();

  const [expandedOpinions, setExpandedOpinions] = useState<Set<string>>(new Set());
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(2);
  const [approvalNote, setApprovalNote] = useState("");
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: proposal, isLoading } = trpc.proposals.get.useQuery(
    { id: proposalId, companyId },
    { enabled: !!companyId }
  );
  const { data: deliberationData } = trpc.proposals.getDeliberation.useQuery(
    { proposalId, companyId },
    { enabled: !!companyId && !!proposal }
  );
  const { data: options, refetch: refetchOptions } = trpc.proposals.getOptions.useQuery(
    { proposalId, companyId },
    { enabled: !!companyId && !!deliberationData }
  );
  const { data: approval } = trpc.approvals.getByProposal.useQuery(
    { proposalId, companyId },
    { enabled: !!companyId && proposal?.status === "pending_approval" }
  );

  const deliberation = deliberationData;
  const opinions: any[] = (deliberationData as any)?.opinions ?? [];

  const startDeliberation = trpc.proposals.deliberate.useMutation({
    onSuccess: () => {
      utils.proposals.get.invalidate();
      utils.proposals.getDeliberation.invalidate();
      utils.notifications.list.invalidate();
      toast.success("Deliberation complete! 13 agents have voted. Awaiting your approval.");
    },
    onError: (e) => toast.error(e.message),
  });

  const generateOptions = trpc.proposals.generateOptions.useMutation({
    onSuccess: () => { refetchOptions(); toast.success("Strategic options generated!"); },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.approvals.approve.useMutation({
    onSuccess: () => {
      utils.proposals.get.invalidate();
      utils.approvals.pending.invalidate();
      toast.success("Proposal approved! ✓");
      setShowApprovalForm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.approvals.reject.useMutation({
    onSuccess: () => {
      utils.proposals.get.invalidate();
      utils.approvals.pending.invalidate();
      toast.success("Proposal rejected.");
      setShowApprovalForm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const reviseMutation = trpc.approvals.requestRevision.useMutation({
    onSuccess: () => {
      utils.proposals.get.invalidate();
      toast.success("Revision requested.");
      setShowApprovalForm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
  if (!proposal) return <div className="p-6 text-muted-foreground">Proposal not found.</div>;

  const canDeliberate = (["draft", "proposed", "needs_revision", "revised"] as string[]).includes(proposal.status ?? "");
  const canApprove = proposal.status === "pending_approval";
  const consensusScore = deliberation?.consensusScore ?? 0;
  const supportCount = opinions.filter((o: any) => o.votedFor).length;

  const toggleOpinion = (role: string) => {
    setExpandedOpinions((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/proposals")} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold truncate">{proposal.title}</h1>
            <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[proposal.status ?? "draft"])}>
              {(proposal.status ?? "draft").replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {proposal.type?.replace(/_/g, " ")} · {currentCompany?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canDeliberate && (
            <Button
              size="sm"
              onClick={() => startDeliberation.mutate({ proposalId, companyId })}
              disabled={startDeliberation.isPending}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
            >
              {startDeliberation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
                : <><Brain className="w-3.5 h-3.5" /> Start Deliberation</>
              }
            </Button>
          )}
          {canApprove && (
            <Button
              size="sm"
              onClick={() => setShowApprovalForm(!showApprovalForm)}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Review & Decide
            </Button>
          )}
        </div>
      </div>

      {/* Approval Decision Panel */}
      {showApprovalForm && canApprove && approval && (
        <div className="mx-6 mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex-shrink-0">
          <h3 className="font-semibold text-amber-300 mb-1 flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4" /> Approval Decision — Approval-First Enforced
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Agent consensus: <strong className="text-foreground">{(consensusScore * 100).toFixed(0)}%</strong> ({supportCount}/{opinions.length} agents support).
            No execution path exists without your explicit approval.
          </p>
          <Textarea
            placeholder="Add a note or reason (optional for approval, required for rejection)..."
            value={approvalNote}
            onChange={(e) => setApprovalNote(e.target.value)}
            className="mb-3 text-sm h-16 resize-none"
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => approveMutation.mutate({ approvalId: approval.id, companyId, reason: approvalNote })}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
            >
              {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => reviseMutation.mutate({ approvalId: approval.id, companyId, notes: approvalNote || "Revision requested" })}
              disabled={reviseMutation.isPending}
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Request Revision
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!approvalNote.trim()) { toast.error("Please provide a rejection reason"); return; }
                rejectMutation.mutate({ approvalId: approval.id, companyId, reason: approvalNote });
              }}
              disabled={rejectMutation.isPending}
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowApprovalForm(false)} className="ml-auto text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <TabsList className="mx-6 mt-4 mb-0 flex-shrink-0 w-fit">
            <TabsTrigger value="overview" className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="deliberation" className="text-xs gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Deliberation
              {opinions.length > 0 && <Badge variant="secondary" className="text-[10px] px-1">{opinions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="options" className="text-xs gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Options
              {options && options.length > 0 && <Badge variant="secondary" className="text-[10px] px-1">{options.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="execution" className="text-xs gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Execution
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="flex-1 overflow-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/50 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-muted-foreground">Budget</span>
                  </div>
                  <p className="text-xl font-bold">
                    {proposal.budget ? `${proposal.currency ?? "USD"} ${Number(proposal.budget).toLocaleString()}` : "Not set"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-muted-foreground">Timeline</span>
                  </div>
                  <p className="text-xl font-bold">{proposal.timeline ?? "Not set"}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-violet-400" />
                    <span className="text-xs text-muted-foreground">Type</span>
                  </div>
                  <p className="text-xl font-bold capitalize">{proposal.type?.replace(/_/g, " ")}</p>
                </CardContent>
              </Card>
            </div>

            {proposal.description && (
              <Card className="bg-card/50 border-white/10">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{proposal.description}</p>
                </CardContent>
              </Card>
            )}

            {(proposal.channels as string[] ?? []).length > 0 && (
              <Card className="bg-card/50 border-white/10">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm">Target Channels</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {(proposal.channels as string[]).map((ch) => (
                      <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {deliberation && (
              <Card className="bg-card/50 border-white/10">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="w-4 h-4 text-violet-400" /> Deliberation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Agent Consensus</span>
                        <span className="font-semibold text-indigo-400">{(consensusScore * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={consensusScore * 100} className="h-2" />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">{supportCount}</div>
                      <div className="text-[10px] text-muted-foreground">support</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-400">{opinions.length - supportCount}</div>
                      <div className="text-[10px] text-muted-foreground">oppose</div>
                    </div>
                  </div>
                  {deliberation.finalRecommendation && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                      <p className="text-xs font-medium text-indigo-300 mb-1">Final Recommendation</p>
                      <div className="text-sm"><Streamdown>{deliberation.finalRecommendation}</Streamdown></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Deliberation */}
          <TabsContent value="deliberation" className="flex-1 overflow-auto px-6 py-4">
            {!deliberation ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4">
                <Brain className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No deliberation yet</p>
                {canDeliberate && (
                  <Button
                    onClick={() => startDeliberation.mutate({ proposalId, companyId })}
                    disabled={startDeliberation.isPending}
                    className="bg-violet-600 hover:bg-violet-700 gap-2"
                  >
                    {startDeliberation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Running 13 agents...</>
                      : <><Play className="w-4 h-4" /> Start 13-Agent Deliberation</>
                    }
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <Card className="bg-card/50 border-white/10 col-span-2">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">Consensus Score</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-indigo-400">{(consensusScore * 100).toFixed(0)}%</span>
                        <span className="text-sm text-muted-foreground mb-1">{supportCount}/{opinions.length}</span>
                      </div>
                      <Progress value={consensusScore * 100} className="h-1.5 mt-2" />
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">Rounds</p>
                      <p className="text-3xl font-bold">{deliberation.totalRounds ?? 2}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-2">Status</p>
                      <Badge variant="outline" className="text-xs capitalize">{deliberation.status}</Badge>
                    </CardContent>
                  </Card>
                </div>

                {deliberation.summary && (
                  <Card className="bg-card/50 border-white/10">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm">Orchestrator Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        <Streamdown>{deliberation.summary}</Streamdown>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    Agent Opinions ({opinions.length})
                  </h3>
                  <div className="space-y-2">
                    {opinions.map((opinion: any) => (
                      <AgentOpinionCard
                        key={opinion.id ?? opinion.agentRole}
                        opinion={opinion}
                        expanded={expandedOpinions.has(opinion.agentRole ?? "")}
                        onToggle={() => toggleOpinion(opinion.agentRole ?? "")}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Options */}
          <TabsContent value="options" className="flex-1 overflow-auto px-6 py-4">
            {!options?.length ? (
              <div className="flex flex-col items-center justify-center h-48 gap-4">
                <BarChart3 className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No strategic options generated yet</p>
                {deliberation ? (
                  <Button
                    onClick={() => generateOptions.mutate({ proposalId, companyId })}
                    disabled={generateOptions.isPending}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    {generateOptions.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                      : <><TrendingUp className="w-4 h-4" /> Generate 3 Strategic Options</>
                    }
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground/60">Run deliberation first to generate options</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Strategic Options Comparison</h3>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => generateOptions.mutate({ proposalId, companyId })}
                    disabled={generateOptions.isPending}
                    className="text-xs gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {options.map((opt) => (
                    <OptionCard
                      key={opt.id}
                      option={opt}
                      selected={selectedOptionIndex === opt.optionIndex}
                      onSelect={() => setSelectedOptionIndex(opt.optionIndex)}
                    />
                  ))}
                </div>
                {(() => {
                  const selected = options.find((o) => o.optionIndex === selectedOptionIndex);
                  if (!selected) return null;
                  return (
                    <Card className="bg-card/50 border-white/10">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm">Option {selected.optionIndex}: {selected.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Pros
                          </p>
                          <ul className="space-y-1">
                            {(selected.pros as string[] ?? []).map((p, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-green-400/60 mt-0.5">+</span>{p}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Cons
                          </p>
                          <ul className="space-y-1">
                            {(selected.cons as string[] ?? []).map((c, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="text-red-400/60 mt-0.5">−</span>{c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          {/* Execution Preview */}
          <TabsContent value="execution" className="flex-1 overflow-auto px-6 py-4">
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <Zap className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {proposal.status === "approved"
                  ? "Execution preview available — generate campaign structure and ad previews"
                  : "Execution preview unlocked after approval"}
              </p>
              {proposal.status === "approved" && options && options.length > 0 ? (
                <Button
                  onClick={() => toast.info("Full execution preview with ad mockups coming in next phase")}
                  className="bg-cyan-600 hover:bg-cyan-700 gap-2"
                >
                  <Zap className="w-4 h-4" /> Generate Execution Plan
                </Button>
              ) : proposal.status !== "approved" ? (
                <p className="text-xs text-muted-foreground/60">
                  Approve the proposal first → execution planning unlocks
                </p>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
