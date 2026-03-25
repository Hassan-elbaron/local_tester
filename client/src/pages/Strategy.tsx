/**
 * Strategy Page — Master Marketing Strategy Viewer
 * Full view of the approved/draft strategy with all components
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TrendingUp, Target, Map, Megaphone, Search, BarChart3,
  Zap, CheckCircle, RefreshCw, Play, ArrowLeft, Brain,
  Globe, Mail, Users, DollarSign
} from "lucide-react";
import { Link } from "wouter";

function SectionCard({ title, icon: Icon, color, children }: {
  title: string; icon: any; color: string; children: React.ReactNode;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${color}`}>
          <Icon className="w-4 h-4" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">{children}</CardContent>
    </Card>
  );
}

function TagList({ items, color = "" }: { items: string[]; color?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className={`text-xs ${color}`}>{item}</Badge>
      ))}
    </div>
  );
}

export default function Strategy() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id ?? 0;

  const { data: strategy, refetch } = trpc.pipeline.getStrategy.useQuery(
    { companyId }, { enabled: !!companyId }
  );
  const { data: personaList = [] } = trpc.pipeline.getPersonas.useQuery(
    { companyId, }, { enabled: !!companyId }
  );
  const { data: competitors = [] } = trpc.pipeline.getCompetitors.useQuery(
    { companyId }, { enabled: !!companyId }
  );

  const genStrategy = trpc.pipeline.generateStrategy.useMutation({
    onSuccess: () => { toast.success("Strategy regenerated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const approveStrategy = trpc.pipeline.approveStrategy.useMutation({
    onSuccess: () => { toast.success("Strategy approved!"); refetch(); },
  });

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a company first</p>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/pipeline">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" />Back to Pipeline</Button>
          </Link>
        </div>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-16 text-center text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-base mb-2">No Strategy Yet</p>
            <p className="text-sm mb-4">Complete the pipeline stages first, then generate the master strategy.</p>
            <div className="flex gap-2 justify-center">
              <Link href="/pipeline">
                <Button variant="outline"><Map className="w-4 h-4 mr-2" />Go to Pipeline</Button>
              </Link>
              <Button onClick={() => genStrategy.mutate({ companyId })} disabled={genStrategy.isPending}>
                {genStrategy.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Generate Strategy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ch = (strategy.channelStrategy ?? {}) as any;
  const funnel = (strategy.funnelArchitecture ?? {}) as any;
  const content = (strategy.contentStrategy ?? {}) as any;
  const seo = (strategy.seoStrategy ?? {}) as any;
  const paid = (strategy.paidMediaStrategy ?? {}) as any;
  const automation = (strategy.automationStrategy ?? {}) as any;
  const kpis = (strategy.kpis ?? {}) as Record<string, string>;
  const approvedPersonas = (personaList as any[]).filter((p: any) => p.status === "approved");
  const confirmedCompetitors = (competitors as any[]).filter((c: any) => c.status === "confirmed");

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
              <TrendingUp className="w-7 h-7 text-indigo-400" />
              Master Marketing Strategy
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={strategy.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : strategy.status === "in_review" ? "bg-amber-500/20 text-amber-300" : "bg-gray-500/20 text-gray-300"}>
                v{strategy.version} · {strategy.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{currentCompany?.name}</span>
              {strategy.approvedBy && <span className="text-xs text-muted-foreground">· Approved by {strategy.approvedBy}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"
            onClick={() => genStrategy.mutate({ companyId })} disabled={genStrategy.isPending}>
            {genStrategy.isPending ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Regenerate
          </Button>
          {strategy.status !== "approved" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => approveStrategy.mutate({ companyId, strategyId: strategy.id })}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
            </Button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategy.positioning && (
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
            <CardContent className="py-5 px-5">
              <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide mb-2">Market Positioning</p>
              <p className="text-sm leading-relaxed">{strategy.positioning}</p>
            </CardContent>
          </Card>
        )}
        {strategy.brandMessage && (
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="py-5 px-5">
              <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide mb-2">Brand Message</p>
              <p className="text-sm font-semibold leading-relaxed">"{strategy.brandMessage}"</p>
              {strategy.toneOfVoice && (
                <p className="text-xs text-muted-foreground mt-2">Tone: {strategy.toneOfVoice}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="channels">
        <TabsList className="bg-card/50 border border-border/50 flex-wrap h-auto">
          <TabsTrigger value="channels" className="gap-1.5"><Globe className="w-3.5 h-3.5" />Channels</TabsTrigger>
          <TabsTrigger value="funnel" className="gap-1.5"><Target className="w-3.5 h-3.5" />Funnel</TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5"><Megaphone className="w-3.5 h-3.5" />Content</TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5"><Search className="w-3.5 h-3.5" />SEO</TabsTrigger>
          <TabsTrigger value="paid" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" />Paid Media</TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5"><Mail className="w-3.5 h-3.5" />Automation</TabsTrigger>
          <TabsTrigger value="kpis" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />KPIs</TabsTrigger>
          <TabsTrigger value="personas" className="gap-1.5"><Users className="w-3.5 h-3.5" />Personas</TabsTrigger>
        </TabsList>

        {/* Channels */}
        <TabsContent value="channels" className="mt-4 space-y-3">
          {ch.primary?.length > 0 && (
            <SectionCard title="Primary Channels" icon={Globe} color="text-blue-400">
              <div className="space-y-2">
                {ch.primary.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.channel}</p>
                      <p className="text-xs text-muted-foreground">{c.rationale}</p>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-300 text-xs">{c.budget_pct}% budget</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {ch.secondary?.length > 0 && (
            <SectionCard title="Secondary Channels" icon={Globe} color="text-cyan-400">
              <div className="space-y-2">
                {ch.secondary.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.channel}</p>
                      <p className="text-xs text-muted-foreground">{c.rationale}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{c.budget_pct}% budget</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          {ch.experimental?.length > 0 && (
            <SectionCard title="Experimental Channels" icon={Zap} color="text-amber-400">
              <div className="space-y-2">
                {ch.experimental.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.channel}</p>
                      <p className="text-xs text-muted-foreground">{c.rationale}</p>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 text-xs">{c.budget_pct}% budget</Badge>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </TabsContent>

        {/* Funnel */}
        <TabsContent value="funnel" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {["awareness", "consideration", "conversion", "retention"].map((stage) => {
            const data = funnel[stage];
            if (!data) return null;
            const colors: Record<string, string> = { awareness: "text-blue-400", consideration: "text-purple-400", conversion: "text-emerald-400", retention: "text-amber-400" };
            return (
              <SectionCard key={stage} title={stage.charAt(0).toUpperCase() + stage.slice(1)} icon={Target} color={colors[stage]}>
                <p className="text-xs text-muted-foreground mb-2">Goal: <span className="text-foreground">{data.goal}</span></p>
                <div className="space-y-1">
                  {(data.tactics as string[] ?? []).map((t: string, i: number) => (
                    <div key={i} className="text-xs flex gap-1.5 text-muted-foreground">
                      <span className={colors[stage]}>·</span>{t}
                    </div>
                  ))}
                </div>
              </SectionCard>
            );
          })}
        </TabsContent>

        {/* Content */}
        <TabsContent value="content" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.themes?.length > 0 && (
              <SectionCard title="Content Themes" icon={Megaphone} color="text-pink-400">
                <TagList items={content.themes} color="text-pink-300" />
              </SectionCard>
            )}
            {content.formats?.length > 0 && (
              <SectionCard title="Content Formats" icon={Megaphone} color="text-violet-400">
                <TagList items={content.formats} />
              </SectionCard>
            )}
          </div>
          {content.keyMessages?.length > 0 && (
            <SectionCard title="Key Messages" icon={Megaphone} color="text-orange-400">
              <ul className="space-y-1">
                {(content.keyMessages as string[]).map((m, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-orange-400">{i + 1}.</span>{m}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
          {content.frequency && (
            <div className="text-xs text-muted-foreground">Posting frequency: <span className="text-foreground font-medium">{content.frequency}</span></div>
          )}
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="mt-4 space-y-4">
          {seo.focusKeywords?.length > 0 && (
            <SectionCard title="Focus Keywords" icon={Search} color="text-emerald-400">
              <TagList items={seo.focusKeywords} color="text-emerald-300" />
            </SectionCard>
          )}
          {seo.contentGaps?.length > 0 && (
            <SectionCard title="Content Gaps to Fill" icon={Search} color="text-blue-400">
              <ul className="space-y-1">
                {(seo.contentGaps as string[]).map((g, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                    <span className="text-blue-400">·</span>{g}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
          {seo.technicalPriorities?.length > 0 && (
            <SectionCard title="Technical Priorities" icon={Zap} color="text-amber-400">
              <TagList items={seo.technicalPriorities} />
            </SectionCard>
          )}
        </TabsContent>

        {/* Paid Media */}
        <TabsContent value="paid" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paid.monthlyBudgetRecommendation && (
              <SectionCard title="Budget Recommendation" icon={DollarSign} color="text-emerald-400">
                <p className="text-sm">{paid.monthlyBudgetRecommendation}</p>
              </SectionCard>
            )}
            {paid.primaryObjective && (
              <SectionCard title="Primary Objective" icon={Target} color="text-blue-400">
                <p className="text-sm capitalize">{paid.primaryObjective}</p>
              </SectionCard>
            )}
          </div>
          {paid.keyAudiences?.length > 0 && (
            <SectionCard title="Key Audiences" icon={Users} color="text-purple-400">
              <TagList items={paid.keyAudiences} color="text-purple-300" />
            </SectionCard>
          )}
          {paid.creativeApproach && (
            <SectionCard title="Creative Approach" icon={Megaphone} color="text-pink-400">
              <p className="text-sm">{paid.creativeApproach}</p>
            </SectionCard>
          )}
        </TabsContent>

        {/* Automation */}
        <TabsContent value="automation" className="mt-4 space-y-4">
          {automation.emailSequences?.length > 0 && (
            <SectionCard title="Email Sequences" icon={Mail} color="text-blue-400">
              <TagList items={automation.emailSequences} />
            </SectionCard>
          )}
          {automation.retargetingWindows?.length > 0 && (
            <SectionCard title="Retargeting Windows" icon={RefreshCw} color="text-orange-400">
              <TagList items={automation.retargetingWindows} />
            </SectionCard>
          )}
          {automation.leadNurturing && (
            <SectionCard title="Lead Nurturing Flow" icon={Target} color="text-purple-400">
              <p className="text-sm text-muted-foreground">{automation.leadNurturing}</p>
            </SectionCard>
          )}
        </TabsContent>

        {/* KPIs */}
        <TabsContent value="kpis" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(kpis).map(([k, v]) => (
              <Card key={k} className="bg-card/50 border-border/50">
                <CardContent className="py-4 px-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{k.replace(/([A-Z])/g, " $1").trim()}</p>
                  <p className="text-lg font-bold text-emerald-400">{v}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {(strategy.executionPriorities as string[] ?? []).length > 0 && (
            <Card className="mt-4 bg-card/50 border-border/50">
              <CardHeader className="pb-2 pt-3 px-5">
                <CardTitle className="text-xs text-amber-400">Execution Priorities</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <ol className="space-y-1.5">
                  {(strategy.executionPriorities as string[]).map((p, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>{p}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Personas */}
        <TabsContent value="personas" className="mt-4">
          {approvedPersonas.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No approved personas yet. Go to the Pipeline to approve personas.</p>
                <Link href="/pipeline">
                  <Button size="sm" variant="outline" className="mt-3">
                    <Map className="w-3.5 h-3.5 mr-1.5" /> Go to Pipeline
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedPersonas.map((p: any) => (
                <Card key={p.id} className="bg-purple-500/5 border-purple-500/30">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {p.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{(p.demographics as any)?.ageRange} · {(p.demographics as any)?.location}</p>
                      </div>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mb-2">{p.description}</p>}
                    {(p.painPoints as string[])?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(p.painPoints as string[]).slice(0, 2).map((pp: string, i: number) => (
                          <Badge key={i} className="bg-rose-500/10 text-rose-300 text-xs px-1.5 py-0">{pp}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Agent Consensus */}
      {strategy.agentConsensus && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-purple-400" />
              <p className="text-sm font-semibold">Agent Consensus</p>
              <Badge className="bg-purple-500/20 text-purple-300 text-xs ml-auto">
                {Math.round(((strategy.agentConsensus as any).consensusScore ?? 0.8) * 100)}% consensus
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {((strategy.agentConsensus as any).supportingAgents as string[] ?? []).map((agent: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs">{agent}</Badge>
              ))}
            </div>
            {((strategy.agentConsensus as any).concerns as string[] ?? []).filter(Boolean).length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-amber-400 mb-1">Concerns flagged:</p>
                {((strategy.agentConsensus as any).concerns as string[]).map((c: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">· {c}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
