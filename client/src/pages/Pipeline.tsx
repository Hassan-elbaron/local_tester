/**
 * Pipeline Page — Central Marketing Journey
 * Shows the full lifecycle from Intake → Business Understanding → Competitors
 * → Personas → Strategy → Approval → Execution → Monitoring
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/i18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Brain, CheckCircle, Clock, AlertCircle, ArrowRight, Play,
  Users, Target, Map, Zap, BarChart3, Building2, Search,
  ChevronRight, RefreshCw, Plus, Trash2, Globe, Star,
  TrendingUp, Shield, Filter, CalendarDays, Megaphone,
  FileText, ChevronDown, ChevronUp, Copy, AlertTriangle,
  Layers, Eye
} from "lucide-react";
import { Link } from "wouter";

// ─── Stage Definitions ────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: "intake", label: "Project Intake", labelAr: "استيعاب المشروع", icon: Building2, color: "text-blue-400" },
  { id: "business_understanding", label: "Business Understanding", labelAr: "فهم البيزنس", icon: Brain, color: "text-purple-400" },
  { id: "competitor_discovery", label: "Competitor Discovery", labelAr: "اكتشاف المنافسين", icon: Search, color: "text-orange-400" },
  { id: "competitor_review", label: "Competitor Review", labelAr: "مراجعة المنافسين", icon: Users, color: "text-yellow-400" },
  { id: "audience_persona", label: "Audience & Personas", labelAr: "الجمهور والشخصيات", icon: Target, color: "text-pink-400" },
  { id: "strategy_generation", label: "Strategy Generation", labelAr: "توليد الاستراتيجية", icon: Map, color: "text-indigo-400" },
  { id: "strategy_review", label: "Strategy Review", labelAr: "مراجعة الاستراتيجية", icon: Shield, color: "text-cyan-400" },
  { id: "strategy_approved", label: "Strategy Approved", labelAr: "اعتماد الاستراتيجية", icon: CheckCircle, color: "text-emerald-400" },
  { id: "execution_ready", label: "Execution Ready", labelAr: "جاهز للتنفيذ", icon: Zap, color: "text-green-400" },
  { id: "monitoring_active", label: "Monitoring Active", labelAr: "المراقبة نشطة", icon: BarChart3, color: "text-teal-400" },
];

function StageStatus({ completed, current, stageId }: { completed: string[]; current: string; stageId: string }) {
  if (completed.includes(stageId) || stageId === current) {
    if (completed.includes(stageId)) return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    return <Clock className="w-4 h-4 text-amber-400 animate-pulse" />;
  }
  return <AlertCircle className="w-4 h-4 text-muted-foreground/30" />;
}

// ─── Competitor Card ──────────────────────────────────────────────────────────
function CompetitorCard({ competitor, onConfirm, onReject, onDelete }: {
  competitor: any; onConfirm: () => void; onReject: () => void; onDelete: () => void;
}) {
  const analysis = competitor.analysis ?? {};
  return (
    <Card className={`border-border/50 ${competitor.status === "confirmed" ? "bg-emerald-500/5 border-emerald-500/30" : competitor.status === "rejected" ? "bg-rose-500/5 border-rose-500/20 opacity-50" : "bg-card/50"}`}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-sm">{competitor.name}</p>
            {competitor.website && (
              <a href={competitor.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                <Globe className="w-3 h-3" />{competitor.website}
              </a>
            )}
          </div>
          <div className="flex gap-1 items-center">
            {competitor.status === "discovered" && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={onConfirm}>✓ Confirm</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                  onClick={onReject}>✗ Reject</Button>
              </>
            )}
            {competitor.status === "confirmed" && <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">Confirmed</Badge>}
            {competitor.status === "rejected" && <Badge className="bg-rose-500/20 text-rose-300 text-xs">Rejected</Badge>}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
              onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
        {analysis.messaging && <p className="text-xs text-muted-foreground mb-2">"{analysis.messaging}"</p>}
        <div className="flex gap-4 text-xs">
          {analysis.pricingModel && (
            <span className="text-muted-foreground">Price: <span className="text-foreground">{analysis.pricingModel}</span></span>
          )}
          {analysis.threatLevel && (
            <span className={`font-medium ${analysis.threatLevel === "high" ? "text-rose-400" : analysis.threatLevel === "medium" ? "text-amber-400" : "text-emerald-400"}`}>
              {analysis.threatLevel} threat
            </span>
          )}
        </div>
        {(competitor.strengths as string[])?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(competitor.strengths as string[]).slice(0, 3).map((s: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">{s}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Persona Card ─────────────────────────────────────────────────────────────
function PersonaCard({ persona, onApprove, onDelete }: { persona: any; onApprove: () => void; onDelete: () => void }) {
  return (
    <Card className={`border-border/50 ${persona.status === "approved" ? "bg-purple-500/5 border-purple-500/30" : "bg-card/50"}`}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              {persona.name[0]}
            </div>
            <div>
              <p className="font-semibold text-sm">{persona.name}</p>
              <p className="text-xs text-muted-foreground">{(persona.demographics as any)?.ageRange ?? ""} · {(persona.demographics as any)?.occupation ?? ""}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {persona.status === "draft" && (
              <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" onClick={onApprove}>
                <Star className="w-3 h-3 mr-1" /> Approve
              </Button>
            )}
            {persona.status === "approved" && <Badge className="bg-purple-500/20 text-purple-300 text-xs">Approved</Badge>}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {persona.description && <p className="text-xs text-muted-foreground mb-2">{persona.description}</p>}
        {(persona.painPoints as string[])?.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-rose-400 mb-1">Pain Points</p>
            <div className="flex flex-wrap gap-1">
              {(persona.painPoints as string[]).slice(0, 3).map((p: string, i: number) => (
                <Badge key={i} className="bg-rose-500/10 text-rose-300 text-xs px-1.5 py-0">{p}</Badge>
              ))}
            </div>
          </div>
        )}
        {(persona.channels as string[])?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(persona.channels as string[]).map((c: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">{c}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Pipeline Page ───────────────────────────────────────────────────────
export default function Pipeline() {
  const { currentCompany } = useCompany();
  const { lang } = useI18n();
  const companyId = currentCompany?.id ?? 0;
  const [addCompetitorOpen, setAddCompetitorOpen] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ name: "", website: "" });

  const utils = trpc.useUtils();

  const { data: pipeline, refetch: refetchPipeline } = trpc.pipeline.get.useQuery(
    { companyId }, { enabled: !!companyId }
  );
  const { data: competitors = [], refetch: refetchCompetitors } = trpc.pipeline.getCompetitors.useQuery(
    { companyId }, { enabled: !!companyId }
  );
  const { data: personaList = [], refetch: refetchPersonas } = trpc.pipeline.getPersonas.useQuery(
    { companyId }, { enabled: !!companyId }
  );
  const { data: strategy } = trpc.pipeline.getStrategy.useQuery(
    { companyId }, { enabled: !!companyId }
  );

  const bizUnderstanding = trpc.pipeline.runBusinessUnderstanding.useMutation({
    onSuccess: () => { toast.success("Business Understanding complete"); refetchPipeline(); },
    onError: (e) => toast.error(e.message),
  });
  const discoverComp = trpc.pipeline.discoverCompetitors.useMutation({
    onSuccess: (data) => { toast.success(`${data.length} competitors discovered`); refetchCompetitors(); refetchPipeline(); },
    onError: (e) => toast.error(e.message),
  });
  const confirmCompetitors = trpc.pipeline.confirmCompetitors.useMutation({
    onSuccess: () => { toast.success("Competitor review confirmed"); refetchPipeline(); },
  });
  const genPersonas = trpc.pipeline.generatePersonas.useMutation({
    onSuccess: (data) => { toast.success(`${data.length} personas generated`); refetchPersonas(); refetchPipeline(); },
    onError: (e) => toast.error(e.message),
  });
  const genStrategy = trpc.pipeline.generateStrategy.useMutation({
    onSuccess: () => { toast.success("Master Strategy generated — review it in Strategy tab"); utils.pipeline.getStrategy.invalidate(); refetchPipeline(); },
    onError: (e) => toast.error(e.message),
  });
  const approveStrategy = trpc.pipeline.approveStrategy.useMutation({
    onSuccess: () => { toast.success("Strategy approved!"); refetchPipeline(); utils.pipeline.getStrategy.invalidate(); },
  });
  const updateCompetitor = trpc.pipeline.updateCompetitor.useMutation({
    onSuccess: () => refetchCompetitors(),
  });
  const deleteCompetitor = trpc.pipeline.deleteCompetitor.useMutation({
    onSuccess: () => refetchCompetitors(),
  });
  const updatePersona = trpc.pipeline.updatePersona.useMutation({
    onSuccess: () => refetchPersonas(),
  });
  const deletePersona = trpc.pipeline.deletePersona.useMutation({
    onSuccess: () => refetchPersonas(),
  });

  // ── Execution Layer ─────────────────────────────────────────────────────────
  const [execSection, setExecSection] = useState<"funnels" | "content" | "assets" | "campaigns">("funnels");
  const [expandedContent, setExpandedContent] = useState<number | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<number | null>(null);

  const { data: funnelList = [], refetch: refetchFunnels } = trpc.execution.getFunnels.useQuery(
    { companyId }, { enabled: !!companyId }
  );
  const { data: calendarItems = [], refetch: refetchCalendar } = trpc.execution.getCalendar.useQuery(
    { companyId }, { enabled: !!companyId }
  );
  const { data: campaignList = [], refetch: refetchCampaigns } = trpc.execution.getCampaigns.useQuery(
    { companyId }, { enabled: !!companyId }
  );
  const { data: assetGaps } = trpc.execution.detectAssetGaps.useQuery(
    { companyId }, { enabled: !!companyId && (calendarItems as any[]).length > 0 }
  );
  const { data: preflight, refetch: refetchPreflight } = trpc.execution.preflightCheck.useQuery(
    { companyId }, { enabled: !!companyId }
  );
  const { data: assetIntakeData = [] } = trpc.execution.getAssetIntake.useQuery(
    { companyId }, { enabled: !!companyId && execSection === "assets" }
  );
  const runFullPipelineMutation = trpc.execution.runFullPipeline.useMutation({
    onSuccess: () => {
      toast.success("Full pipeline complete!");
      refetchFunnels(); refetchCalendar(); refetchCampaigns();
      refetchPreflight();
    },
    onError: (e) => toast.error(e.message),
  });
  const approveContentBatch = trpc.execution.approveContentBatch.useMutation({
    onSuccess: (data) => { toast.success(`${(data as any).approved} items approved`); refetchCalendar(); },
  });
  const { data: execStatus, refetch: refetchExecStatus } = trpc.execution.getExecutionStatus.useQuery(
    { companyId }, { enabled: !!companyId }
  );

  const buildFunnels = trpc.execution.buildFunnels.useMutation({
    onSuccess: (data) => { toast.success(`${(data as any[]).length} funnels built`); refetchFunnels(); refetchPipeline(); },
    onError: (e) => toast.error(e.message),
  });
  const approveFunnel = trpc.execution.approveFunnel.useMutation({
    onSuccess: () => { toast.success("Funnel approved"); refetchFunnels(); },
  });
  const removeFunnel = trpc.execution.deleteFunnel.useMutation({
    onSuccess: () => refetchFunnels(),
  });

  const buildContent = trpc.execution.buildContent.useMutation({
    onSuccess: (data) => { toast.success(`${(data as any[]).length} content items planned`); refetchCalendar(); refetchPipeline(); },
    onError: (e) => toast.error(e.message),
  });
  const genCopyItem = trpc.execution.generateCopyForItem.useMutation({
    onSuccess: () => { toast.success("Copy generated"); refetchCalendar(); },
    onError: (e) => toast.error(e.message),
  });
  const genBulkCopy = trpc.execution.generateBulkCopy.useMutation({
    onSuccess: (data) => { toast.success(`Bulk copy: ${(data as any).count} items written`); refetchCalendar(); },
    onError: (e) => toast.error(e.message),
  });
  const removeContentItem = trpc.execution.deleteContentItem.useMutation({
    onSuccess: () => refetchCalendar(),
  });

  const buildCampaigns = trpc.execution.buildCampaigns.useMutation({
    onSuccess: (data) => { toast.success(`${(data as any[]).length} campaign docs built`); refetchCampaigns(); refetchPipeline(); },
    onError: (e) => toast.error(e.message),
  });
  const runAssetMap = trpc.execution.runAssetMapping.useMutation({
    onSuccess: (data) => {
      toast.success(`Asset mapping complete: ${(data as any).mapped} assets linked`);
      refetchCalendar();
      refetchExecStatus?.();
    },
    onError: (e) => toast.error(e.message),
  });
  const runCopyAll = trpc.execution.runCopyGeneration.useMutation({
    onSuccess: (data) => {
      toast.success(`Copy generation complete: ${(data as any).count} items`);
      refetchCalendar();
      refetchExecStatus?.();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateCampaignSt = trpc.execution.updateCampaignStatus.useMutation({
    onSuccess: () => refetchCampaigns(),
  });

  // ── Strategy Versioning ────────────────────────────────────────────────────
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  const [editSection, setEditSection] = useState<{ key: string; label: string; type: string; value: unknown } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareVA, setCompareVA] = useState<number | null>(null);
  const [compareVB, setCompareVB] = useState<number | null>(null);
  const [deliberationResult, setDeliberationResult] = useState<{ section: string; result: any } | null>(null);

  const { data: versionHistory = [], refetch: refetchVersions } = trpc.pipeline.getVersionHistory.useQuery(
    { companyId, strategyId: strategy?.id ?? 0 },
    { enabled: !!companyId && !!strategy?.id && versionPanelOpen }
  );

  const { data: versionCompare } = trpc.pipeline.compareVersions.useQuery(
    { companyId, versionIdA: compareVA ?? 0, versionIdB: compareVB ?? 0 },
    { enabled: !!compareVA && !!compareVB && compareOpen }
  );

  const editSectionMutation = trpc.pipeline.editStrategySection.useMutation({
    onSuccess: () => {
      toast.success("Section updated and snapshot saved");
      utils.pipeline.getStrategy.invalidate();
      refetchVersions();
      setEditSection(null);
      setEditValue("");
      setChangeReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const rollbackMutation = trpc.pipeline.rollbackToVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`Rolled back to version ${(data as any).restoredVersion}`);
      utils.pipeline.getStrategy.invalidate();
      refetchVersions();
      setVersionPanelOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deliberateSectionMutation = trpc.pipeline.deliberateSection.useMutation({
    onSuccess: (data, vars) => {
      setDeliberationResult({ section: vars.section, result: data });
      toast.success("Section deliberation complete — review recommendation below");
    },
    onError: (e) => toast.error(e.message),
  });

  const SECTION_DEFS = [
    { key: "positioning",         label: "Brand Positioning",    type: "text",  color: "indigo"  },
    { key: "brandMessage",        label: "Brand Message",        type: "text",  color: "purple"  },
    { key: "toneOfVoice",         label: "Tone of Voice",        type: "text",  color: "pink"    },
    { key: "channelStrategy",     label: "Channel Strategy",     type: "json",  color: "blue"    },
    { key: "funnelArchitecture",  label: "Funnel Architecture",  type: "json",  color: "cyan"    },
    { key: "contentStrategy",     label: "Content Strategy",     type: "json",  color: "teal"    },
    { key: "seoStrategy",         label: "SEO Strategy",         type: "json",  color: "green"   },
    { key: "paidMediaStrategy",   label: "Paid Media Strategy",  type: "json",  color: "amber"   },
    { key: "automationStrategy",  label: "Automation Strategy",  type: "json",  color: "orange"  },
    { key: "kpis",                label: "KPIs & Goals",         type: "json",  color: "emerald" },
    { key: "executionPriorities", label: "Execution Priorities", type: "json",  color: "rose"    },
  ] as const;

  function openEditSection(key: string) {
    const def = SECTION_DEFS.find(d => d.key === key);
    if (!def || !strategy) return;
    const currentVal = (strategy as any)[key];
    setEditSection({ key, label: def.label, type: def.type, value: currentVal });
    setEditValue(def.type === "text" ? String(currentVal ?? "") : JSON.stringify(currentVal ?? {}, null, 2));
    setChangeReason("");
  }

  function submitSectionEdit() {
    if (!editSection || !strategy) return;
    let parsedValue: unknown = editValue;
    if (editSection.type === "json") {
      try { parsedValue = JSON.parse(editValue); }
      catch { toast.error("Invalid JSON — please fix syntax before saving"); return; }
    }
    editSectionMutation.mutate({ companyId, section: editSection.key, value: parsedValue, changeReason });
  }

  const completed = (pipeline?.completedStages as string[] ?? []);
  const currentStage = pipeline?.currentStage ?? "intake";
  const bizReport = (pipeline?.businessReport ?? {}) as Record<string, unknown>;

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Map className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a company to view the marketing pipeline</p>
        </div>
      </div>
    );
  }

  const confirmedCount = (competitors as any[]).filter((c: any) => c.status === "confirmed").length;
  const approvedPersonaCount = (personaList as any[]).filter((p: any) => p.status === "approved").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="w-7 h-7 text-indigo-400" />
            {lang === "ar" ? "خط سير المشروع التسويقي" : "Marketing Pipeline"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {currentCompany?.name} · Stage: <span className="text-foreground font-medium">{currentStage.replace(/_/g, " ")}</span>
          </p>
        </div>
      </div>

      {/* Pipeline Progress Bar */}
      <div className="relative">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isDone = completed.includes(stage.id);
            const isCurrent = stage.id === currentStage;
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="flex items-center gap-1 shrink-0">
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isDone ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : isCurrent ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 animate-pulse"
                  : "bg-card/50 text-muted-foreground/50 border border-border/30"
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${isDone ? "text-emerald-400" : isCurrent ? "text-indigo-400" : "text-muted-foreground/30"}`} />
                  <span className="hidden md:inline">{stage.label}</span>
                </div>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-card/50 border border-border/50 flex-wrap h-auto gap-0.5">
          <TabsTrigger value="overview" className="gap-1.5"><Brain className="w-3.5 h-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="business" className="gap-1.5"><Building2 className="w-3.5 h-3.5" />Business</TabsTrigger>
          <TabsTrigger value="competitors" className="gap-1.5">
            <Search className="w-3.5 h-3.5" />Competitors
            {confirmedCount > 0 && <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{confirmedCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="personas" className="gap-1.5">
            <Users className="w-3.5 h-3.5" />Personas
            {approvedPersonaCount > 0 && <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{approvedPersonaCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="strategy" className="gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />Strategy
            {strategy?.status === "approved" && <CheckCircle className="w-3 h-3 text-emerald-400" />}
          </TabsTrigger>
          <TabsTrigger value="execution" className="gap-1.5">
            <Zap className="w-3.5 h-3.5" />Execution
            {(funnelList as any[]).length > 0 && <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{(funnelList as any[]).length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PIPELINE_STAGES.map((stage) => {
              const isDone = completed.includes(stage.id);
              const isCurrent = stage.id === currentStage;
              const Icon = stage.icon;
              return (
                <Card key={stage.id} className={`border-border/50 ${isDone ? "bg-emerald-500/5 border-emerald-500/20" : isCurrent ? "bg-indigo-500/5 border-indigo-500/30" : "bg-card/30 opacity-60"}`}>
                  <CardContent className="py-3 px-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDone ? "bg-emerald-500/20" : isCurrent ? "bg-indigo-500/20" : "bg-card"}`}>
                      <Icon className={`w-4 h-4 ${isDone ? "text-emerald-400" : isCurrent ? "text-indigo-400" : "text-muted-foreground/30"}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{stage.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {isDone ? "Completed" : isCurrent ? "In Progress" : "Pending"}
                      </p>
                    </div>
                    <StageStatus completed={completed} current={currentStage} stageId={stage.id} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Business Understanding Tab */}
        <TabsContent value="business" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" /> Business Understanding Report
            </h2>
            <Button
              size="sm"
              onClick={() => bizUnderstanding.mutate({ companyId })}
              disabled={bizUnderstanding.isPending}
            >
              {bizUnderstanding.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-2" />}
              {completed.includes("business_understanding") ? "Re-run Analysis" : "Run Analysis"}
            </Button>
          </div>
          {Object.keys(bizReport).length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Run the analysis to generate a Business Understanding Report</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {!!bizReport.valuePropStatement && (
                <Card className="bg-purple-500/5 border-purple-500/30">
                  <CardContent className="py-4 px-4">
                    <p className="text-xs text-purple-400 font-medium mb-1">Value Proposition</p>
                    <p className="text-sm font-semibold">{String(bizReport.valuePropStatement)}</p>
                  </CardContent>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "strengths", label: "Strengths", color: "emerald" },
                  { key: "weaknesses", label: "Weaknesses", color: "rose" },
                  { key: "opportunities", label: "Opportunities", color: "blue" },
                  { key: "threats", label: "Threats", color: "amber" },
                ].map(({ key, label, color }) => (
                  (bizReport[key] as string[] ?? []).length > 0 && (
                    <Card key={key} className="bg-card/50 border-border/50">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className={`text-xs font-semibold text-${color}-400`}>{label}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-0 px-4 pb-3">
                        <ul className="space-y-1">
                          {(bizReport[key] as string[]).map((item, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                              <span className={`text-${color}-400 mt-0.5`}>·</span>{item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                ))}
              </div>
              {!!bizReport.uniqueSellingPoints && (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-medium text-indigo-400 mb-2">Unique Selling Points</p>
                    <div className="flex flex-wrap gap-2">
                      {(bizReport.uniqueSellingPoints as string[]).map((usp, i) => (
                        <Badge key={i} className="bg-indigo-500/20 text-indigo-300 text-xs">{usp}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {!!bizReport.initialPositioning && (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-medium text-cyan-400 mb-1">Initial Positioning</p>
                    <p className="text-sm">{String(bizReport.initialPositioning)}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Competitors Tab */}
        <TabsContent value="competitors" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-400" /> Competitor Discovery & Review
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAddCompetitorOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Manually
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => discoverComp.mutate({ companyId })}
                disabled={discoverComp.isPending}>
                {discoverComp.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                {(competitors as any[]).length > 0 ? "Re-discover" : "Discover Competitors"}
              </Button>
              {confirmedCount > 0 && (
                <Button size="sm"
                  onClick={() => confirmCompetitors.mutate({ companyId })}
                  disabled={confirmCompetitors.isPending}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Confirm Set ({confirmedCount})
                </Button>
              )}
            </div>
          </div>
          {(competitors as any[]).length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No competitors yet. Click "Discover Competitors" to find them automatically.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(competitors as any[]).map((comp: any) => (
                <CompetitorCard
                  key={comp.id}
                  competitor={comp}
                  onConfirm={() => updateCompetitor.mutate({ companyId, id: comp.id, name: comp.name, status: "confirmed" })}
                  onReject={() => updateCompetitor.mutate({ companyId, id: comp.id, name: comp.name, status: "rejected" })}
                  onDelete={() => deleteCompetitor.mutate({ companyId, competitorId: comp.id })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Personas Tab */}
        <TabsContent value="personas" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-400" /> Audience Personas
            </h2>
            <Button size="sm"
              onClick={() => genPersonas.mutate({ companyId })}
              disabled={genPersonas.isPending}>
              {genPersonas.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
              {(personaList as any[]).length > 0 ? "Re-generate Personas" : "Generate Personas"}
            </Button>
          </div>
          {(personaList as any[]).length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No personas yet. Confirm competitors first, then generate personas.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(personaList as any[]).map((p: any) => (
                <PersonaCard
                  key={p.id}
                  persona={p}
                  onApprove={() => updatePersona.mutate({ companyId, id: p.id, name: p.name, status: "approved" })}
                  onDelete={() => deletePersona.mutate({ companyId, personaId: p.id })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="mt-4 space-y-4">

          {/* Header Row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Master Marketing Strategy
            </h2>
            <div className="flex flex-wrap gap-2">
              {strategy && (
                <Button size="sm" variant="outline"
                  onClick={() => setVersionPanelOpen(v => !v)}>
                  <Layers className="w-3.5 h-3.5 mr-1.5" />
                  Version History
                  {versionPanelOpen && <ChevronUp className="w-3 h-3 ml-1" />}
                  {!versionPanelOpen && <ChevronDown className="w-3 h-3 ml-1" />}
                </Button>
              )}
              <Button size="sm" variant="outline"
                onClick={() => genStrategy.mutate({ companyId })}
                disabled={genStrategy.isPending}>
                {genStrategy.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                {strategy ? "Regenerate" : "Generate Strategy"}
              </Button>
              {strategy && strategy.status !== "approved" && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => approveStrategy.mutate({ companyId, strategyId: strategy.id })}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                </Button>
              )}
              {strategy?.status === "approved" && (
                <Link href="/strategy">
                  <Button size="sm" variant="outline">
                    <ArrowRight className="w-3.5 h-3.5 mr-1.5" /> Full View
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {!strategy ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No strategy yet. Approve personas first, then generate the master strategy.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">

              {/* Status Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={strategy.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : strategy.status === "in_review" ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-300"}>
                  v{strategy.version} · {strategy.status}
                </Badge>
                {strategy.approvedBy && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" /> Approved by {strategy.approvedBy}
                  </span>
                )}
                {(strategy.revisionHistory as any[] ?? []).length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    · {(strategy.revisionHistory as any[]).length} revision(s)
                  </span>
                )}
              </div>

              {/* Version History Panel */}
              {versionPanelOpen && (
                <Card className="bg-card/60 border-blue-500/30">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-blue-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Saved Versions
                      </CardTitle>
                      {(versionHistory as any[]).length >= 2 && (
                        <Button size="sm" variant="outline" className="h-6 text-xs"
                          onClick={() => setCompareOpen(true)}>
                          <Eye className="w-3 h-3 mr-1" /> Compare
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 px-4 pb-3">
                    {(versionHistory as any[]).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No saved versions yet. Versions are created automatically when you edit sections.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {(versionHistory as any[]).map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between p-2 rounded bg-card/50 border border-border/30">
                            <div>
                              <span className="text-xs font-medium text-blue-300">v{v.version}</span>
                              <span className="text-xs text-muted-foreground ml-2">{v.changedBy}</span>
                              {v.changeReason && <span className="text-xs text-muted-foreground ml-2">· {v.changeReason}</span>}
                              <p className="text-xs text-muted-foreground/60 mt-0.5">
                                {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {compareVA === null ? (
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-400 hover:bg-blue-500/10"
                                  onClick={() => { setCompareVA(v.id); setCompareOpen(true); }}>
                                  Compare
                                </Button>
                              ) : compareVA !== v.id ? (
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-purple-400 hover:bg-purple-500/10"
                                  onClick={() => { setCompareVB(v.id); setCompareOpen(true); }}>
                                  With this
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground"
                                  onClick={() => setCompareVA(null)}>
                                  Cancel
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-6 text-xs text-amber-400 hover:bg-amber-500/10"
                                onClick={() => {
                                  if (confirm(`Rollback to version ${v.version}? Current state will be snapshot first.`)) {
                                    rollbackMutation.mutate({ companyId, versionId: v.id });
                                  }
                                }}
                                disabled={rollbackMutation.isPending}>
                                ↩ Restore
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Deliberation Result */}
              {deliberationResult && (
                <Card className="bg-purple-500/5 border-purple-500/30">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-purple-300 flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5" /> Agent Recommendation: {deliberationResult.section}
                      </CardTitle>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground"
                        onClick={() => setDeliberationResult(null)}>✕</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 px-4 pb-3 space-y-2">
                    <div>
                      <p className="text-xs text-purple-400 font-medium mb-1">Recommendation</p>
                      <p className="text-sm">{deliberationResult.result.recommendation}</p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-400 font-medium mb-1">Reasoning</p>
                      <p className="text-xs text-muted-foreground">{deliberationResult.result.reasoning}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span>Confidence: <span className="font-bold text-emerald-400">{Math.round((deliberationResult.result.confidenceScore ?? 0.75) * 100)}%</span></span>
                      <span className="text-muted-foreground">Agents: {(deliberationResult.result.agentsInvolved ?? []).join(", ")}</span>
                    </div>
                    <Button size="sm" variant="outline" className="mt-1 text-xs border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                      onClick={() => {
                        const def = SECTION_DEFS.find(d => d.label === deliberationResult.section || d.key === deliberationResult.section);
                        if (!def) return;
                        setEditSection({ key: def.key, label: def.label, type: def.type, value: deliberationResult.result.proposedValue });
                        setEditValue(def.type === "text" ? String(deliberationResult.result.proposedValue ?? "") : JSON.stringify(deliberationResult.result.proposedValue ?? {}, null, 2));
                        setChangeReason(`AI recommendation applied (${Math.round((deliberationResult.result.confidenceScore ?? 0.75) * 100)}% confidence)`);
                        setDeliberationResult(null);
                      }}>
                      Apply Recommendation →
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Section Cards — Editable */}
              <div className="space-y-3">
                {SECTION_DEFS.map(({ key, label, type, color }) => {
                  const value = (strategy as any)[key];
                  if (!value && value !== 0) return null;
                  const isDeliberating = deliberateSectionMutation.isPending && deliberateSectionMutation.variables?.section === key;

                  return (
                    <Card key={key} className="bg-card/50 border-border/50 group">
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className={`text-xs font-medium text-${color}-400`}>{label}</p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-purple-400 hover:bg-purple-500/10 px-2"
                              onClick={() => deliberateSectionMutation.mutate({ companyId, section: key })}
                              disabled={deliberateSectionMutation.isPending}
                              title="Re-deliberate this section with AI agents">
                              {isDeliberating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-400 hover:bg-blue-500/10 px-2"
                              onClick={() => openEditSection(key)}
                              title="Edit this section">
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {type === "text" ? (
                          <p className="text-sm">{String(value)}</p>
                        ) : Array.isArray(value) ? (
                          <ol className="space-y-1">
                            {(value as string[]).slice(0, 5).map((item: string, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                <span className={`text-${color}-400 font-bold`}>{i + 1}.</span>{item}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <div className="space-y-1">
                            {Object.entries(value as Record<string, unknown>).slice(0, 5).map(([k, v]) => (
                              <div key={k} className="flex items-start justify-between text-xs gap-2">
                                <span className="text-muted-foreground shrink-0">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                                <span className="font-medium text-right line-clamp-1">{typeof v === "object" ? JSON.stringify(v).slice(0, 60) : String(v)}</span>
                              </div>
                            ))}
                            {Object.keys(value as Record<string, unknown>).length > 5 && (
                              <p className="text-xs text-muted-foreground/50">+{Object.keys(value as Record<string, unknown>).length - 5} more fields</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {strategy.agentConsensus && (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs text-purple-400 font-medium mb-2">Agent Consensus</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span>Score: <span className="font-bold text-emerald-400">
                        {Math.round(((strategy.agentConsensus as any).consensusScore ?? 0.8) * 100)}%
                      </span></span>
                      <span>Confidence: <span className="font-medium">
                        {(strategy.agentConsensus as any).confidence ?? "high"}
                      </span></span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Edit Section Dialog */}
        <Dialog open={!!editSection} onOpenChange={(o) => !o && setEditSection(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-blue-400" />
                Edit: {editSection?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {editSection?.type === "text" ? (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Value</Label>
                  <textarea
                    className="w-full min-h-[120px] bg-background border border-border/50 rounded-md p-3 text-sm resize-y font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    placeholder={`Enter ${editSection.label}...`}
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">JSON Value</Label>
                  <textarea
                    className="w-full min-h-[220px] bg-background border border-border/50 rounded-md p-3 text-xs resize-y font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Reason for Change (optional)</Label>
                <Input
                  value={changeReason}
                  onChange={e => setChangeReason(e.target.value)}
                  placeholder="e.g. Updated based on competitor review..."
                  className="h-8 text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground/60">
                ℹ️ A version snapshot will be saved automatically before this edit.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditSection(null)}>Cancel</Button>
                <Button size="sm" onClick={submitSectionEdit} disabled={editSectionMutation.isPending}>
                  {editSectionMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Save & Snapshot
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Compare Versions Dialog */}
        <Dialog open={compareOpen} onOpenChange={(o) => { if (!o) { setCompareOpen(false); setCompareVA(null); setCompareVB(null); }}}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" /> Compare Strategy Versions
              </DialogTitle>
            </DialogHeader>
            <div className="mt-3 space-y-3">
              {/* Version pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Version A</Label>
                  <select
                    className="w-full bg-background border border-border/50 rounded-md px-2 py-1.5 text-sm"
                    value={compareVA ?? ""}
                    onChange={e => setCompareVA(Number(e.target.value) || null)}
                  >
                    <option value="">Select version...</option>
                    {(versionHistory as any[]).map((v: any) => (
                      <option key={v.id} value={v.id}>v{v.version} — {v.changedBy} — {new Date(v.createdAt).toLocaleDateString()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Version B</Label>
                  <select
                    className="w-full bg-background border border-border/50 rounded-md px-2 py-1.5 text-sm"
                    value={compareVB ?? ""}
                    onChange={e => setCompareVB(Number(e.target.value) || null)}
                  >
                    <option value="">Select version...</option>
                    {(versionHistory as any[]).filter((v: any) => v.id !== compareVA).map((v: any) => (
                      <option key={v.id} value={v.id}>v{v.version} — {v.changedBy} — {new Date(v.createdAt).toLocaleDateString()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Diff results */}
              {versionCompare && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground bg-card/50 rounded p-2 border border-border/30">
                    {(versionCompare as any).summary}
                  </p>
                  {((versionCompare as any).diffs as any[]).filter((d: any) => d.changed).map((diff: any) => (
                    <Card key={diff.field} className="bg-card/50 border-amber-500/30">
                      <CardContent className="py-2 px-3">
                        <p className="text-xs font-medium text-amber-400 mb-1.5">{diff.label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-rose-500/5 border border-rose-500/20 rounded p-2">
                            <p className="text-xs text-rose-400 font-medium mb-1">Version A</p>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">{typeof diff.versionA === "string" ? diff.versionA : JSON.stringify(diff.versionA, null, 2)}</pre>
                          </div>
                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2">
                            <p className="text-xs text-emerald-400 font-medium mb-1">Version B</p>
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">{typeof diff.versionB === "string" ? diff.versionB : JSON.stringify(diff.versionB, null, 2)}</pre>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {((versionCompare as any).diffs as any[]).filter((d: any) => !d.changed).length > 0 && (
                    <p className="text-xs text-muted-foreground/50 text-center">
                      {((versionCompare as any).diffs as any[]).filter((d: any) => !d.changed).length} section(s) unchanged
                    </p>
                  )}
                </div>
              )}
              {!versionCompare && compareVA && compareVB && (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-50" />
                  Loading comparison...
                </div>
              )}
              {(!compareVA || !compareVB) && (
                <p className="text-xs text-muted-foreground text-center py-4">Select two versions to compare</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Execution Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="execution" className="mt-4 space-y-4">

          {/* Execution Pipeline Progress */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-semibold text-muted-foreground/70 mb-3">Execution Pipeline Progress</p>
              <div className="flex items-center gap-1 overflow-x-auto">
                {([
                  { key: "funnels_built", label: "Funnels Built", color: "indigo" },
                  { key: "content_planned", label: "Content Planned", color: "pink" },
                  { key: "assets_mapped", label: "Assets Mapped", color: "orange" },
                  { key: "copy_generated", label: "Copy Generated", color: "purple" },
                  { key: "campaigns_ready", label: "Campaigns Ready", color: "amber" },
                ] as const).map(({ key, label, color }, idx) => {
                  const done = (execStatus as any)?.stages?.[key] ?? false;
                  return (
                    <div key={key} className="flex items-center gap-1 shrink-0">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                        done ? `bg-${color}-500/20 text-${color}-300 border border-${color}-500/30`
                        : "bg-card text-muted-foreground/40 border border-border/30"
                      }`}>
                        {done ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-40" />}
                        <span className="hidden sm:inline">{label}</span>
                      </div>
                      {idx < 4 && <ChevronRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pre-flight Status */}
          {preflight && (
            <div className="flex items-start justify-between gap-4">
              <Card className={`flex-1 border-border/50 ${!preflight.ok ? "bg-amber-500/5 border-amber-500/30" : "bg-emerald-500/5 border-emerald-500/30"}`}>
                <CardContent className="py-3 px-4">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    {preflight.ok
                      ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">System Ready</span></>
                      : <><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-400">Action Required</span></>
                    }
                  </p>
                  {(preflight as any).issues.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {((preflight as any).issues as string[]).map((issue: string, i: number) => (
                        <p key={i} className="text-xs text-rose-400 flex gap-1.5"><span>✗</span>{issue}</p>
                      ))}
                    </div>
                  )}
                  {(preflight as any).warnings.length > 0 && (
                    <div className="space-y-1">
                      {((preflight as any).warnings as string[]).map((w: string, i: number) => (
                        <p key={i} className="text-xs text-amber-300 flex gap-1.5"><span>⚠</span>{w}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Button
                size="sm"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shrink-0"
                onClick={() => runFullPipelineMutation.mutate({ companyId })}
                disabled={runFullPipelineMutation.isPending || !(preflight as any).ok}
                title={!(preflight as any).ok ? "Fix issues before running full pipeline" : "Run all 5 steps automatically"}
              >
                {runFullPipelineMutation.isPending
                  ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Running Pipeline…</>
                  : <><Zap className="w-3.5 h-3.5 mr-2" />Run Full Pipeline</>
                }
              </Button>
            </div>
          )}

          {/* Sub-section Switcher */}
          <div className="flex gap-2 border-b border-border/50 pb-3">
            {([
              { id: "funnels", label: "Funnels", icon: Filter, count: (funnelList as any[]).length },
              { id: "content", label: "Content Calendar", icon: CalendarDays, count: (calendarItems as any[]).length },
              { id: "assets", label: "Assets", icon: Layers, count: 0 },
              { id: "campaigns", label: "Campaigns", icon: Megaphone, count: (campaignList as any[]).length },
            ] as const).map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setExecSection(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  execSection === id
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count > 0 && (
                  <span className={`px-1.5 py-0 rounded text-xs ${execSection === id ? "bg-indigo-500/30 text-indigo-200" : "bg-card text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── FUNNELS Section ──────────────────────────────────────────────── */}
          {execSection === "funnels" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-400" /> Marketing Funnels
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    AI builds 4 funnels (Awareness → Consideration → Conversion → Retention) from your approved strategy
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => buildFunnels.mutate({ companyId })}
                  disabled={buildFunnels.isPending || !strategy}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {buildFunnels.isPending
                    ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Building…</>
                    : <><Zap className="w-3.5 h-3.5 mr-2" />{(funnelList as any[]).length > 0 ? "Rebuild Funnels" : "Build Funnels"}</>
                  }
                </Button>
              </div>

              {!strategy && (
                <Card className="bg-amber-500/5 border-amber-500/30">
                  <CardContent className="py-3 px-4 flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Strategy must be approved before building funnels
                  </CardContent>
                </Card>
              )}

              {(funnelList as any[]).length === 0 && strategy ? (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No funnels yet — click "Build Funnels" to generate</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(funnelList as any[]).map((funnel: any) => {
                    const stageColor: Record<string, string> = {
                      awareness: "blue", consideration: "purple",
                      conversion: "emerald", retention: "amber",
                    };
                    const sc = stageColor[funnel.stage] ?? "indigo";
                    return (
                      <Card key={funnel.id} className={`border-border/50 ${funnel.status === "approved" ? `bg-${sc}-500/5 border-${sc}-500/30` : "bg-card/50"}`}>
                        <CardContent className="py-4 px-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">{funnel.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge className={`bg-${sc}-500/20 text-${sc}-300 text-xs capitalize`}>{funnel.stage}</Badge>
                                {funnel.budgetPct && (
                                  <span className="text-xs text-muted-foreground">{funnel.budgetPct}% budget</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {funnel.status === "draft" && (
                                <Button size="sm" className={`h-7 text-xs bg-${sc}-600 hover:bg-${sc}-700`}
                                  onClick={() => approveFunnel.mutate({ companyId, funnelId: funnel.id })}>
                                  <CheckCircle className="w-3 h-3 mr-1" />Approve
                                </Button>
                              )}
                              {funnel.status === "approved" && (
                                <Badge className={`bg-${sc}-500/20 text-${sc}-300 text-xs`}>✓ Approved</Badge>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                                onClick={() => removeFunnel.mutate({ companyId, funnelId: funnel.id })}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          {funnel.goal && <p className="text-xs text-muted-foreground mb-2">{funnel.goal}</p>}
                          {(funnel.channels as string[] ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {(funnel.channels as string[]).map((ch: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">{ch}</Badge>
                              ))}
                            </div>
                          )}
                          {(funnel.steps as any[] ?? []).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {(funnel.steps as any[]).slice(0, 3).map((step: any) => (
                                <div key={step.step} className="flex items-start gap-2 text-xs">
                                  <span className={`w-4 h-4 rounded-full bg-${sc}-500/20 text-${sc}-300 flex items-center justify-center text-[10px] shrink-0 font-bold`}>{step.step}</span>
                                  <span className="text-muted-foreground">{step.action}{step.cta ? <span className="text-indigo-300 ml-1">→ {step.cta}</span> : null}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {funnel.kpis && Object.keys(funnel.kpis).length > 0 && (
                            <div className="mt-3 pt-2 border-t border-border/30 flex flex-wrap gap-3">
                              {Object.entries(funnel.kpis as Record<string, string>).slice(0, 3).map(([k, v]) => (
                                <span key={k} className="text-xs">
                                  <span className="text-muted-foreground">{k}: </span>
                                  <span className="font-medium">{v}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── CONTENT CALENDAR Section ─────────────────────────────────────── */}
          {execSection === "content" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-pink-400" /> Content Calendar
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Monthly content plan with platform, brief, caption, and CTA per post
                  </p>
                </div>
                <div className="flex gap-2">
                  {(calendarItems as any[]).length > 0 && (
                    <Button size="sm" variant="outline"
                      onClick={() => genBulkCopy.mutate({ companyId })}
                      disabled={genBulkCopy.isPending}
                    >
                      {genBulkCopy.isPending
                        ? <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />Writing…</>
                        : <><Copy className="w-3.5 h-3.5 mr-1" />Bulk Generate Copy</>
                      }
                    </Button>
                  )}
                  {(calendarItems as any[]).filter((i: any) => i.copyStatus === "copywritten").length > 0 && (
                    <Button size="sm" variant="outline" className="border-emerald-500/50 text-emerald-400"
                      onClick={() => approveContentBatch.mutate({
                        companyId,
                        itemIds: (calendarItems as any[])
                          .filter((i: any) => i.copyStatus === "copywritten")
                          .map((i: any) => i.id),
                      })}
                      disabled={approveContentBatch.isPending}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve All Written
                    </Button>
                  )}
                  <Button size="sm"
                    onClick={() => buildContent.mutate({ companyId, months: 1 })}
                    disabled={buildContent.isPending || (funnelList as any[]).length === 0}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    {buildContent.isPending
                      ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Planning…</>
                      : <><CalendarDays className="w-3.5 h-3.5 mr-2" />{(calendarItems as any[]).length > 0 ? "Rebuild Calendar" : "Plan Content"}</>
                    }
                  </Button>
                </div>
              </div>

              {(funnelList as any[]).length === 0 && (
                <Card className="bg-amber-500/5 border-amber-500/30">
                  <CardContent className="py-3 px-4 flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Build funnels first before planning content
                  </CardContent>
                </Card>
              )}

              {/* Asset Gaps */}
              {assetGaps && (assetGaps as any).gaps?.length > 0 && (
                <Card className="bg-orange-500/5 border-orange-500/30">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-medium text-orange-400 mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />Asset Gaps Detected
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {((assetGaps as any).gaps as string[]).map((g: string, i: number) => (
                        <Badge key={i} className="bg-orange-500/10 text-orange-300 text-xs">{g}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(calendarItems as any[]).length === 0 ? (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No content planned yet — click "Plan Content" to generate</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {/* Group by week */}
                  {Array.from(new Set((calendarItems as any[]).map((i: any) => i.week))).sort((a, b) => Number(a) - Number(b)).map((week) => {
                    const weekItems = (calendarItems as any[]).filter((i: any) => i.week === week);
                    return (
                      <div key={String(week)}>
                        <p className="text-xs font-semibold text-muted-foreground/70 px-1 mb-1.5">Week {week}</p>
                        <div className="space-y-2">
                          {weekItems.map((item: any) => {
                            const isExpanded = expandedContent === item.id;
                            const statusColors: Record<string, string> = {
                              planned: "bg-muted/50 text-muted-foreground",
                              briefed: "bg-blue-500/20 text-blue-300",
                              copywritten: "bg-purple-500/20 text-purple-300",
                              approved: "bg-emerald-500/20 text-emerald-300",
                              published: "bg-green-500/20 text-green-300",
                            };
                            return (
                              <Card key={item.id} className="bg-card/50 border-border/50">
                                <CardContent className="py-3 px-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                                        <CalendarDays className="w-3.5 h-3.5 text-pink-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-medium">{item.platform}</span>
                                          <Badge className={`text-xs ${statusColors[item.copyStatus] ?? "bg-muted text-muted-foreground"}`}>{item.copyStatus}</Badge>
                                          {item.funnelStage && (
                                            <Badge variant="outline" className="text-xs capitalize">{item.funnelStage}</Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.concept}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2 shrink-0">
                                      {item.copyStatus === "briefed" && (
                                        <Button size="sm" variant="outline" className="h-7 text-xs"
                                          onClick={() => genCopyItem.mutate({ companyId, itemId: item.id })}
                                          disabled={genCopyItem.isPending}>
                                          {genCopyItem.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3 mr-1" />}
                                          Copy
                                        </Button>
                                      )}
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground"
                                        onClick={() => setExpandedContent(isExpanded ? null : item.id)}>
                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400"
                                        onClick={() => removeContentItem.mutate({ companyId, itemId: item.id })}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-border/30 space-y-2.5">
                                      {item.objective && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground/70 mb-0.5">Objective</p>
                                          <p className="text-xs">{item.objective}</p>
                                        </div>
                                      )}
                                      {item.brief && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground/70 mb-0.5">Brief</p>
                                          <p className="text-xs text-muted-foreground">{item.brief}</p>
                                        </div>
                                      )}
                                      {item.caption && (
                                        <div>
                                          <p className="text-xs font-medium text-purple-400 mb-0.5">Caption</p>
                                          <p className="text-xs bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 whitespace-pre-wrap">{item.caption}</p>
                                        </div>
                                      )}
                                      {item.ctaText && (
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-medium text-muted-foreground/70">CTA:</p>
                                          <Badge className="bg-indigo-500/20 text-indigo-300 text-xs">{item.ctaText}</Badge>
                                        </div>
                                      )}
                                      {item.visualNotes && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground/70 mb-0.5">Visual Notes</p>
                                          <p className="text-xs text-muted-foreground italic">{item.visualNotes}</p>
                                        </div>
                                      )}
                                      {(item.requiredAssets as string[] ?? []).length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground/70 mb-1">Required Assets</p>
                                          <div className="flex flex-wrap gap-1">
                                            {(item.requiredAssets as string[]).map((a: string, i: number) => (
                                              <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ASSETS Section ────────────────────────────────────────────── */}
          {execSection === "assets" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-400" /> Asset System
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload assets in Companies → Files, then map them to content items here
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline"
                    onClick={() => runAssetMap.mutate({ companyId })}
                    disabled={runAssetMap.isPending || (calendarItems as any[]).length === 0}>
                    {runAssetMap.isPending
                      ? <><RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />Mapping…</>
                      : <><Layers className="w-3.5 h-3.5 mr-1" />Run Asset Mapping</>
                    }
                  </Button>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => runCopyAll.mutate({ companyId })}
                    disabled={runCopyAll.isPending || (calendarItems as any[]).length === 0}>
                    {runCopyAll.isPending
                      ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Generating…</>
                      : <><Copy className="w-3.5 h-3.5 mr-2" />Generate All Copy</>
                    }
                  </Button>
                </div>
              </div>

              {assetGaps && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-emerald-500/5 border-emerald-500/30">
                    <CardContent className="py-4 px-4 text-center">
                      <p className="text-2xl font-bold text-emerald-400">{(assetGaps as any).available?.length ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Assets Uploaded</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/5 border-blue-500/30">
                    <CardContent className="py-4 px-4 text-center">
                      <p className="text-2xl font-bold text-blue-400">{(assetGaps as any).requiredByContent?.length ?? 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Required by Content</p>
                    </CardContent>
                  </Card>
                  <Card className={(assetGaps as any).missing?.length > 0 ? "bg-rose-500/5 border-rose-500/30" : "bg-emerald-500/5 border-emerald-500/30"}>
                    <CardContent className="py-4 px-4 text-center">
                      <p className={`text-2xl font-bold ${(assetGaps as any).missing?.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        {(assetGaps as any).missing?.length ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Missing Assets</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {assetGaps && (assetGaps as any).available?.length > 0 && (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold text-emerald-400 mb-2">Uploaded Assets</p>
                    <div className="space-y-1.5">
                      {((assetGaps as any).available as any[]).map((asset: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center text-[10px]">
                            {asset.isImage ? "🖼️" : asset.mimeType?.includes("pdf") ? "📄" : "📁"}
                          </div>
                          <span className="flex-1">{asset.fileName}</span>
                          <Badge className="bg-card text-muted-foreground text-xs capitalize">{asset.category}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(assetIntakeData as any[]).length > 0 && (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold text-blue-400 mb-2">Asset Requirements Per Post ({(assetIntakeData as any[]).length} items)</p>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {(assetIntakeData as any[]).slice(0, 20).map((asset: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            asset.gapStatus === "available" ? "bg-emerald-400"
                            : asset.gapStatus === "partial" ? "bg-amber-400"
                            : "bg-rose-400"
                          }`} />
                          <span className="flex-1 truncate">{asset.assetName}</span>
                          <Badge className={`text-xs shrink-0 ${
                            asset.source === "uploaded" ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                          }`}>{asset.source}</Badge>
                          <Badge variant="outline" className="text-xs shrink-0 capitalize">{asset.assetType}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {assetGaps && (assetGaps as any).gaps?.length > 0 && (
                <Card className="bg-orange-500/5 border-orange-500/30">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />Critical Asset Gaps
                    </p>
                    <div className="space-y-1">
                      {((assetGaps as any).gaps as string[]).map((g: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-orange-400">→</span>{g}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {assetGaps && (assetGaps as any).recommendations?.length > 0 && (
                <Card className="bg-blue-500/5 border-blue-500/30">
                  <CardContent className="py-3 px-4">
                    <p className="text-xs font-semibold text-blue-400 mb-2">Recommendations</p>
                    <div className="space-y-1">
                      {((assetGaps as any).recommendations as string[]).map((r: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground flex gap-2">
                          <span className="text-blue-400">✓</span>{r}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(!assetGaps || (assetGaps as any).available?.length === 0) && (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm mb-2">No assets uploaded yet</p>
                    <p className="text-xs opacity-70">Go to Companies → Files to upload logos, photos, videos</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── CAMPAIGNS Section ────────────────────────────────────────────── */}
          {execSection === "campaigns" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-400" /> Campaign Builds
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Full campaign structure with audiences, A/B tests, budget logic, and launch checklist
                  </p>
                </div>
                <Button size="sm"
                  onClick={() => buildCampaigns.mutate({ companyId })}
                  disabled={buildCampaigns.isPending || (funnelList as any[]).length === 0}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {buildCampaigns.isPending
                    ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Building…</>
                    : <><Megaphone className="w-3.5 h-3.5 mr-2" />{(campaignList as any[]).length > 0 ? "Rebuild Campaigns" : "Build Campaigns"}</>
                  }
                </Button>
              </div>

              {(funnelList as any[]).length === 0 && (
                <Card className="bg-amber-500/5 border-amber-500/30">
                  <CardContent className="py-3 px-4 flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Build and approve funnels first before building campaigns
                  </CardContent>
                </Card>
              )}

              {(campaignList as any[]).length === 0 ? (
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No campaigns built yet — click "Build Campaigns" to generate</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {(campaignList as any[]).map((campaign: any) => {
                    const isExpanded = expandedCampaign === campaign.id;
                    const stColors: Record<string, string> = {
                      draft: "bg-muted/50 text-muted-foreground",
                      ready: "bg-blue-500/20 text-blue-300",
                      launched: "bg-emerald-500/20 text-emerald-300",
                    };
                    return (
                      <Card key={campaign.id} className="bg-card/50 border-border/50">
                        <CardContent className="py-4 px-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                                <Megaphone className="w-4 h-4 text-amber-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold">{campaign.name}</span>
                                  <Badge variant="outline" className="text-xs">{campaign.platform}</Badge>
                                  <Badge className={`text-xs ${stColors[campaign.status] ?? ""}`}>{campaign.status}</Badge>
                                </div>
                                {campaign.objective && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{campaign.objective}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              {campaign.status === "draft" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/50 text-blue-400"
                                  onClick={() => updateCampaignSt.mutate({ companyId, campaignId: campaign.id, status: "ready" })}>
                                  Mark Ready
                                </Button>
                              )}
                              {campaign.status === "ready" && (
                                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => updateCampaignSt.mutate({ companyId, campaignId: campaign.id, status: "launched" })}>
                                  <Zap className="w-3 h-3 mr-1" />Launch
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground"
                                onClick={() => setExpandedCampaign(isExpanded ? null : campaign.id)}>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-3 border-t border-border/30 space-y-4">
                              {/* A/B Tests */}
                              {(campaign.abTestMatrix as any[] ?? []).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-blue-400 mb-2">A/B Test Matrix</p>
                                  <div className="space-y-1.5">
                                    {(campaign.abTestMatrix as any[]).slice(0, 4).map((test: any, i: number) => (
                                      <div key={i} className="bg-card/50 rounded-lg p-2.5 text-xs">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge className="bg-blue-500/20 text-blue-300 text-xs capitalize">{test.element}</Badge>
                                          {test.successMetric && <span className="text-muted-foreground">Metric: {test.successMetric}</span>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="bg-blue-500/5 border border-blue-500/20 rounded p-1.5">
                                            <p className="text-[10px] text-blue-400 font-medium mb-0.5">Variant A</p>
                                            <p className="text-muted-foreground">{test.variantA}</p>
                                          </div>
                                          <div className="bg-purple-500/5 border border-purple-500/20 rounded p-1.5">
                                            <p className="text-[10px] text-purple-400 font-medium mb-0.5">Variant B</p>
                                            <p className="text-muted-foreground">{test.variantB}</p>
                                          </div>
                                        </div>
                                        {test.hypothesis && <p className="text-muted-foreground/70 italic mt-1">{test.hypothesis}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Audiences */}
                              {(campaign.audiences as any[] ?? []).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-pink-400 mb-2">Audiences</p>
                                  <div className="space-y-1.5">
                                    {(campaign.audiences as any[]).map((aud: any, i: number) => (
                                      <div key={i} className="bg-card/50 rounded-lg p-2.5 text-xs">
                                        <p className="font-medium">{aud.name}</p>
                                        {aud.description && <p className="text-muted-foreground">{aud.description}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Launch Checklist */}
                              {(campaign.launchChecklist as string[] ?? []).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-emerald-400 mb-2">Launch Checklist</p>
                                  <div className="space-y-1">
                                    {(campaign.launchChecklist as string[]).map((item: string, i: number) => (
                                      <div key={i} className="flex items-start gap-2 text-xs">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400/40 shrink-0 mt-0.5" />
                                        <span className="text-muted-foreground">{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Build Docs */}
                              {campaign.buildDocs && (
                                <div>
                                  <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />Build Document
                                  </p>
                                  <pre className="text-xs text-muted-foreground bg-card/50 border border-border/50 rounded-lg p-3 whitespace-pre-wrap font-mono">
                                    {campaign.buildDocs}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </TabsContent>
      </Tabs>

      {/* Add Competitor Dialog */}
      <Dialog open={addCompetitorOpen} onOpenChange={setAddCompetitorOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Competitor Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company Name</Label>
              <Input placeholder="Competitor Inc." value={newCompetitor.name}
                onChange={e => setNewCompetitor(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Website (optional)</Label>
              <Input placeholder="https://competitor.com" value={newCompetitor.website}
                onChange={e => setNewCompetitor(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAddCompetitorOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!newCompetitor.name) { toast.error("Name required"); return; }
                updateCompetitor.mutate({
                  companyId, name: newCompetitor.name,
                  website: newCompetitor.website || undefined,
                  status: "confirmed", discoveredBy: "user",
                });
                setNewCompetitor({ name: "", website: "" });
                setAddCompetitorOpen(false);
                toast.success("Competitor added");
              }}>Add Competitor</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
