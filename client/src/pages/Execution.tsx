/**
 * Execution Page — Strategy → Funnels → Content → Campaigns
 * The bridge between approved strategy and actual marketing execution.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Zap, Target, Calendar, Megaphone, BarChart3, Play,
  CheckCircle, RefreshCw, Trash2, AlertTriangle, Eye,
  Copy, FileText, PenLine, Package, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

// ─── Funnel Card ──────────────────────────────────────────────────────────────
function FunnelCard({ funnel, onApprove, onDelete }: { funnel: any; onApprove: () => void; onDelete: () => void }) {
  const stageColors: Record<string, string> = {
    awareness: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    consideration: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    conversion: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    retention: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  const cls = stageColors[funnel.stage] ?? "text-gray-400 bg-gray-500/10 border-gray-500/20";

  return (
    <Card className={`border ${funnel.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 bg-card/50"}`}>
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">{funnel.name}</p>
            <Badge className={`text-xs mt-1 border ${cls}`}>{funnel.stage}</Badge>
          </div>
          <div className="flex gap-1.5">
            {funnel.status === "draft" && (
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={onApprove}>
                <CheckCircle className="w-3 h-3 mr-1" />Approve
              </Button>
            )}
            {funnel.status === "approved" && <Badge className="bg-emerald-500/20 text-emerald-300 text-xs">Approved</Badge>}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-400" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        {funnel.goal && <p className="text-xs text-muted-foreground">Goal: {funnel.goal}</p>}
        {(funnel.channels as string[])?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(funnel.channels as string[]).map((c: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">{c}</Badge>
            ))}
          </div>
        )}
        {(funnel.steps as any[])?.length > 0 && (
          <div className="space-y-1">
            {(funnel.steps as any[]).slice(0, 3).map((s: any, i: number) => (
              <div key={i} className="text-xs flex gap-1.5 text-muted-foreground">
                <span className="font-bold text-foreground">{s.step}.</span>{s.action}
                {s.cta && <span className="text-blue-400 ml-auto shrink-0">→ {s.cta}</span>}
              </div>
            ))}
          </div>
        )}
        {funnel.kpis && Object.keys(funnel.kpis).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/30">
            {Object.entries(funnel.kpis as Record<string, string>).slice(0, 3).map(([k, v]) => (
              <span key={k} className="text-xs text-muted-foreground">{k}: <span className="text-foreground font-medium">{v}</span></span>
            ))}
          </div>
        )}
        {funnel.budgetPct && (
          <div className="text-xs text-amber-400">Budget allocation: {funnel.budgetPct}%</div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Content Item Card ────────────────────────────────────────────────────────
function ContentCard({ item, onGenerateCopy, onDelete }: { item: any; onGenerateCopy: () => void; onDelete: () => void }) {
  const [showCaption, setShowCaption] = useState(false);
  const statusColors: Record<string, string> = {
    planned: "bg-gray-500/20 text-gray-300",
    briefed: "bg-blue-500/20 text-blue-300",
    copywritten: "bg-purple-500/20 text-purple-300",
    approved: "bg-emerald-500/20 text-emerald-300",
    published: "bg-green-500/20 text-green-300",
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-1.5 py-0">{item.platform}</Badge>
            <Badge className={`text-xs ${statusColors[item.copyStatus] ?? "bg-gray-500/20"}`}>{item.copyStatus}</Badge>
            {item.week && <span className="text-xs text-muted-foreground">W{item.week}</span>}
          </div>
          <div className="flex gap-1">
            {item.copyStatus === "briefed" && (
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={onGenerateCopy}>
                <PenLine className="w-3 h-3 mr-1" />Write Copy
              </Button>
            )}
            {item.caption && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-400" onClick={() => setShowCaption(!showCaption)}>
                <Eye className="w-3 h-3" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-400" onClick={onDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {item.concept && <p className="text-xs font-medium mb-1">{item.concept}</p>}
        {item.objective && <p className="text-xs text-muted-foreground mb-1">Obj: {item.objective}</p>}
        {item.funnelStage && (
          <Badge className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{item.funnelStage}</Badge>
        )}
        {showCaption && item.caption && (
          <div className="mt-2 p-2 bg-card rounded border border-border/50">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.caption}</p>
          </div>
        )}
        {item.ctaText && <p className="text-xs text-blue-400 mt-1">CTA: {item.ctaText}</p>}
        {(item.requiredAssets as string[])?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {(item.requiredAssets as string[]).map((a: string, i: number) => (
              <Badge key={i} className="bg-amber-500/10 text-amber-300 text-xs px-1 py-0 border border-amber-500/20">
                <Package className="w-2.5 h-2.5 mr-0.5" />{a}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onMarkReady }: { campaign: any; onMarkReady: () => void }) {
  const [showDocs, setShowDocs] = useState(false);

  return (
    <Card className={`border-border/50 ${campaign.status === "ready" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card/50"}`}>
      <CardContent className="py-4 px-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">{campaign.name}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{campaign.platform}</Badge>
              {campaign.objective && <Badge className="bg-blue-500/10 text-blue-300 text-xs border-0">{campaign.objective}</Badge>}
              <Badge className={`text-xs ${campaign.status === "ready" ? "bg-emerald-500/20 text-emerald-300" : campaign.status === "launched" ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-300"}`}>
                {campaign.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1.5">
            {campaign.status === "draft" && (
              <Button size="sm" className="h-7 text-xs" onClick={onMarkReady}>Mark Ready</Button>
            )}
            {campaign.buildDocs && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowDocs(!showDocs)}>
                <FileText className="w-3 h-3 mr-1" />Docs
              </Button>
            )}
          </div>
        </div>

        {(campaign.audiences as any[])?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Audiences:</p>
            <div className="flex flex-wrap gap-1">
              {(campaign.audiences as any[]).map((a: any, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{a.name ?? `Audience ${i+1}`}</Badge>
              ))}
            </div>
          </div>
        )}

        {(campaign.launchChecklist as string[])?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Launch Checklist:</p>
            <ul className="space-y-0.5">
              {(campaign.launchChecklist as string[]).slice(0, 4).map((step: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-emerald-400">☐</span>{step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(campaign.abTestMatrix as any[])?.length > 0 && (
          <div>
            <p className="text-xs text-purple-400 mb-1">A/B Tests:</p>
            {(campaign.abTestMatrix as any[]).slice(0, 2).map((t: any, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">· {t.element}: {t.variantA} vs {t.variantB}</p>
            ))}
          </div>
        )}

        {showDocs && campaign.buildDocs && (
          <div className="p-3 bg-black/20 rounded border border-border/50">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{campaign.buildDocs}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Execution Page ──────────────────────────────────────────────────────
export default function Execution() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id ?? 0;
  const utils = trpc.useUtils();

  const { data: funnelList = [], refetch: refetchFunnels } = trpc.execution.getFunnels.useQuery({ companyId }, { enabled: !!companyId });
  const { data: calendar = [], refetch: refetchCalendar } = trpc.execution.getCalendar.useQuery({ companyId }, { enabled: !!companyId });
  const { data: campaigns = [], refetch: refetchCampaigns } = trpc.execution.getCampaigns.useQuery({ companyId }, { enabled: !!companyId });
  const { data: assetGaps } = trpc.execution.detectAssetGaps.useQuery({ companyId }, { enabled: !!companyId && (calendar as any[]).length > 0 });
  const { data: strategy } = trpc.pipeline.getStrategy.useQuery({ companyId }, { enabled: !!companyId });

  const buildFunnels = trpc.execution.buildFunnels.useMutation({
    onSuccess: (d) => { toast.success(`${d.length} funnels built`); refetchFunnels(); },
    onError: (e) => toast.error(e.message),
  });
  const approveFunnel = trpc.execution.approveFunnel.useMutation({ onSuccess: () => refetchFunnels() });
  const deleteFunnel = trpc.execution.deleteFunnel.useMutation({ onSuccess: () => refetchFunnels() });

  const buildContent = trpc.execution.buildContent.useMutation({
    onSuccess: (d) => { toast.success(`${d.length} content items planned`); refetchCalendar(); },
    onError: (e) => toast.error(e.message),
  });
  const genCopy = trpc.execution.generateCopyForItem.useMutation({
    onSuccess: () => { toast.success("Copy written"); refetchCalendar(); },
    onError: (e) => toast.error(e.message),
  });
  const bulkCopy = trpc.execution.generateBulkCopy.useMutation({
    onSuccess: (d) => { toast.success(`${d.count} items copywritten`); refetchCalendar(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteContent = trpc.execution.deleteContentItem.useMutation({ onSuccess: () => refetchCalendar() });

  const buildCampaigns = trpc.execution.buildCampaigns.useMutation({
    onSuccess: (d) => { toast.success(`${d.length} campaigns built`); refetchCampaigns(); },
    onError: (e) => toast.error(e.message),
  });
  const markReady = trpc.execution.updateCampaignStatus.useMutation({ onSuccess: () => refetchCampaigns() });

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a company first</p>
      </div>
    );
  }

  const approvedFunnels = (funnelList as any[]).filter((f: any) => f.status === "approved").length;
  const copywrittenItems = (calendar as any[]).filter((i: any) => ["copywritten","approved","published"].includes(i.copyStatus)).length;
  const readyCampaigns = (campaigns as any[]).filter((c: any) => ["ready","launched"].includes(c.status)).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/pipeline">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" />Pipeline</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="w-7 h-7 text-amber-400" />
              Execution Layer
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {currentCompany?.name} · Strategy → Funnels → Content → Campaigns
            </p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {!strategy?.status || strategy.status !== "approved" ? (
        <Card className="bg-amber-500/5 border-amber-500/30">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">Strategy must be approved before building execution assets.</p>
            <Link href="/strategy" className="ml-auto">
              <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-300">
                Go to Strategy →
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Approved Funnels", value: approvedFunnels, total: (funnelList as any[]).length, icon: Target, color: "text-blue-400" },
            { label: "Content Items", value: copywrittenItems, total: (calendar as any[]).length, icon: Calendar, color: "text-purple-400", suffix: " with copy" },
            { label: "Ready Campaigns", value: readyCampaigns, total: (campaigns as any[]).length, icon: BarChart3, color: "text-emerald-400" },
          ].map(({ label, value, total, icon: Icon, color, suffix }) => (
            <Card key={label} className="bg-card/50 border-border/50">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color} shrink-0`} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{value}<span className="text-sm text-muted-foreground font-normal">/{total}{suffix ?? ""}</span></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="funnels">
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="funnels" className="gap-1.5">
            <Target className="w-3.5 h-3.5" />Funnels
            {approvedFunnels > 0 && <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{approvedFunnels}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />Content
            {(calendar as any[]).length > 0 && <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{(calendar as any[]).length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-1.5">
            <Package className="w-3.5 h-3.5" />Assets
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Megaphone className="w-3.5 h-3.5" />Campaigns
            {readyCampaigns > 0 && <Badge variant="secondary" className="text-xs px-1 py-0 h-4">{readyCampaigns}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Funnels */}
        <TabsContent value="funnels" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />Funnel Blueprints
            </h2>
            <Button size="sm"
              onClick={() => buildFunnels.mutate({ companyId })}
              disabled={buildFunnels.isPending}>
              {buildFunnels.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
              {(funnelList as any[]).length > 0 ? "Rebuild Funnels" : "Build Funnels"}
            </Button>
          </div>
          {(funnelList as any[]).length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No funnels yet. Build funnels from the approved strategy.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(funnelList as any[]).map((f: any) => (
                <FunnelCard key={f.id} funnel={f}
                  onApprove={() => approveFunnel.mutate({ companyId, funnelId: f.id })}
                  onDelete={() => deleteFunnel.mutate({ companyId, funnelId: f.id })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Content Calendar */}
        <TabsContent value="content" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />Content Calendar
            </h2>
            <div className="flex gap-2">
              {(calendar as any[]).some((i: any) => i.copyStatus === "briefed") && (
                <Button size="sm" variant="outline"
                  onClick={() => bulkCopy.mutate({ companyId })}
                  disabled={bulkCopy.isPending}>
                  {bulkCopy.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  Write All Copy
                </Button>
              )}
              <Button size="sm"
                onClick={() => buildContent.mutate({ companyId, months: 1 })}
                disabled={buildContent.isPending}>
                {buildContent.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                {(calendar as any[]).length > 0 ? "Rebuild Calendar" : "Plan Content"}
              </Button>
            </div>
          </div>

          {(calendar as any[]).length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No content planned yet. Build funnels first, then plan content.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Group by week */}
              {[1, 2, 3, 4].map((week) => {
                const weekItems = (calendar as any[]).filter((i: any) => i.week === week);
                if (!weekItems.length) return null;
                return (
                  <div key={week}>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">WEEK {week}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {weekItems.map((item: any) => (
                        <ContentCard key={item.id} item={item}
                          onGenerateCopy={() => genCopy.mutate({ companyId, itemId: item.id })}
                          onDelete={() => deleteContent.mutate({ companyId, itemId: item.id })}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* Assets */}
        <TabsContent value="assets" className="mt-4 space-y-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />Asset Intelligence
          </h2>
          {!assetGaps ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Build your content calendar first to detect required assets.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />Typically Available
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1">
                  {((assetGaps.available ?? []) as any[]).map((a: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-emerald-400">✓</span>{typeof a === "string" ? a : a.fileName ?? a.category ?? String(a)}
                    </p>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />Required by Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1">
                  {(assetGaps.missing ?? []).slice(0, 8).map((a: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-amber-400">!</span>{a}
                    </p>
                  ))}
                  {(assetGaps.missing?.length ?? 0) > 8 && (
                    <p className="text-xs text-muted-foreground">+{(assetGaps.missing?.length ?? 0) - 8} more</p>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-rose-500/5 border-rose-500/20">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />Critical Gaps
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1">
                  {(assetGaps.gaps ?? []).map((g: string, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-rose-400">✗</span>{g}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          {/* Link to file upload */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="py-4 px-4 flex items-center gap-3">
              <Package className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-sm font-medium">Upload Assets</p>
                <p className="text-xs text-muted-foreground">Upload logos, photos, guidelines in the Companies page</p>
              </div>
              <Link href="/companies" className="ml-auto">
                <Button size="sm" variant="outline">Go to Files →</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns */}
        <TabsContent value="campaigns" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-orange-400" />Campaign Builds
            </h2>
            <Button size="sm"
              onClick={() => buildCampaigns.mutate({ companyId })}
              disabled={buildCampaigns.isPending}>
              {buildCampaigns.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
              {(campaigns as any[]).length > 0 ? "Rebuild Campaigns" : "Build Campaigns"}
            </Button>
          </div>
          {(campaigns as any[]).length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No campaigns yet. Build content calendar first, then build campaigns.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(campaigns as any[]).map((c: any) => (
                <CampaignCard key={c.id} campaign={c}
                  onMarkReady={() => markReady.mutate({ companyId, campaignId: c.id, status: "ready" })}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
