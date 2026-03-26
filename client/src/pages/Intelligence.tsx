import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/i18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Brain, Lightbulb, Shield, TrendingUp, BarChart3,
  CheckCircle, XCircle, Clock, Zap, AlertTriangle,
  RefreshCw, Plus, ChevronRight, Target, BookOpen,
  Activity, Star, Lock
} from "lucide-react";

export default function Intelligence() {
  const { currentCompany: selectedCompany } = useCompany();
  const { t } = useI18n();
  const companyId = selectedCompany?.id ?? 0;
  const [selectedLearnings, setSelectedLearnings] = useState<number[]>([]);
  const [showResultForm, setShowResultForm] = useState(false);
  const [resultForm, setResultForm] = useState({
    proposalId: "", actualRoas: "", actualCpa: "", actualSpend: "",
    actualRevenue: "", actualConversions: "", notes: "",
    performanceVsPrediction: "" as "exceeded" | "met" | "below" | "far_below" | "",
  });

  const { data: learnings = [], refetch: refetchLearnings } = trpc.intelligence.getLearnings.useQuery(
    { companyId, limit: 50 },
    { enabled: !!companyId }
  );
  const { data: rules = [], refetch: refetchRules } = trpc.intelligence.getRules.useQuery(
    { companyId },
    { enabled: !!companyId }
  );
  const { data: campaignResults = [], refetch: refetchResults } = trpc.intelligence.getCampaignResults.useQuery(
    { companyId },
    { enabled: !!companyId }
  );
  const { data: proposalsData } = trpc.proposals.list.useQuery(
    { companyId },
    { enabled: !!companyId }
  );
  const proposals = proposalsData ?? [];

  const approveRuleMut = trpc.intelligence.approveRule.useMutation({
    onSuccess: () => { toast.success(t("general.success")); refetchRules(); },
  });
  const rejectRuleMut = trpc.intelligence.rejectRule.useMutation({
    onSuccess: () => { toast.success(t("general.success")); refetchRules(); },
  });
  const generateRuleMut = trpc.intelligence.generateRule.useMutation({
    onSuccess: () => { toast.success(t("general.success")); refetchRules(); setSelectedLearnings([]); },
  });
  const discoverPatternsMut = trpc.intelligence.discoverPatterns.useMutation({
    onSuccess: (data) => {
      if (data.length) toast.success(`${data.length} ${t("general.success")}`);
      else toast.info(t("general.noData"));
    },
  });
  const saveCampaignResultMut = trpc.intelligence.saveCampaignResult.useMutation({
    onSuccess: () => {
      toast.success(t("general.success"));
      refetchResults(); refetchLearnings(); setShowResultForm(false);
      setResultForm({ proposalId: "", actualRoas: "", actualCpa: "", actualSpend: "", actualRevenue: "", actualConversions: "", notes: "", performanceVsPrediction: "" });
    },
  });

  const categoryColors: Record<string, string> = {
    budget: "bg-emerald-500/20 text-emerald-300",
    audience: "bg-blue-500/20 text-blue-300",
    creative: "bg-purple-500/20 text-purple-300",
    timing: "bg-amber-500/20 text-amber-300",
    channel: "bg-cyan-500/20 text-cyan-300",
    approval_pattern: "bg-rose-500/20 text-rose-300",
    owner_preference: "bg-indigo-500/20 text-indigo-300",
    market: "bg-teal-500/20 text-teal-300",
    general: "bg-gray-500/20 text-gray-300",
  };

  const pendingRules = (rules as any[]).filter((r: any) => !r.approvedByHuman);
  const activeRules = (rules as any[]).filter((r: any) => r.isActive);

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("intelligence.noCompany")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-400" />
            {t("intelligence.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("intelligence.subtitleAlt")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => discoverPatternsMut.mutate({ companyId })}
            disabled={discoverPatternsMut.isPending}
          >
            <RefreshCw className={`w-4 h-4 me-2 ${discoverPatternsMut.isPending ? "animate-spin" : ""}`} />
            {t("intelligence.discoverPatterns")}
          </Button>
          <Button size="sm" onClick={() => setShowResultForm(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t("intelligence.addResults")}
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">{t("intelligence.learnings")}</span>
            </div>
            <p className="text-2xl font-bold">{(learnings as any[]).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-muted-foreground">{t("intelligence.activeRules")}</span>
            </div>
            <p className="text-2xl font-bold">{activeRules.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-muted-foreground">{t("intelligence.pendingApproval")}</span>
            </div>
            <p className="text-2xl font-bold">{pendingRules.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-muted-foreground">{t("intelligence.campaignResults")}</span>
            </div>
            <p className="text-2xl font-bold">{(campaignResults as any[]).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="learnings">
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="learnings" className="gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            {t("intelligence.tabs.learnings")}
            {(learnings as any[]).length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">{(learnings as any[]).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {t("intelligence.tabs.rules")}
            {pendingRules.length > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0 h-4">{pendingRules.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            {t("intelligence.tabs.campaigns")}
          </TabsTrigger>
          <TabsTrigger value="governance" className="gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            {t("intelligence.tabs.governance")}
          </TabsTrigger>
        </TabsList>

        {/* Learnings Tab */}
        <TabsContent value="learnings" className="space-y-3 mt-4">
          {(learnings as any[]).length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t("intelligence.noLearnings")}</p>
                <p className="text-sm mt-1">{t("intelligence.noLearningsDesc")}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {selectedLearnings.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <Lightbulb className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-sm text-purple-300">
                    {selectedLearnings.length} {t("intelligence.learningsSelected")}
                  </span>
                  <Button
                    size="sm"
                    className="ms-auto"
                    onClick={() => generateRuleMut.mutate({ companyId, learningIds: selectedLearnings })}
                    disabled={generateRuleMut.isPending}
                  >
                    <Zap className="w-3.5 h-3.5 me-1.5" />
                    {t("intelligence.generateRule")}
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                {(learnings as any[]).map((learning: any) => (
                  <Card
                    key={learning.id}
                    className={`bg-card/50 border-border/50 cursor-pointer transition-colors ${
                      selectedLearnings.includes(learning.id) ? "border-purple-500/50 bg-purple-500/5" : "hover:border-border"
                    }`}
                    onClick={() => setSelectedLearnings(prev =>
                      prev.includes(learning.id) ? prev.filter(id => id !== learning.id) : [...prev, learning.id]
                    )}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                          learning.whySucceeded ? "bg-emerald-400" : learning.whyFailed ? "bg-rose-400" : "bg-blue-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={`text-xs ${categoryColors[learning.category] ?? "bg-gray-500/20 text-gray-300"}`}>
                              {learning.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {learning.eventType?.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground ms-auto">
                              {Math.round(parseFloat(learning.confidence ?? "0.7") * 100)}% {t("intelligence.confidenceLabel")}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{learning.whatHappened}</p>
                          <p className="text-xs text-purple-300 mt-1 flex items-start gap-1">
                            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                            {learning.actionableInsight}
                          </p>
                          {learning.pattern && (
                            <p className="text-xs text-amber-300 mt-1 flex items-start gap-1">
                              <Star className="w-3 h-3 mt-0.5 shrink-0" />
                              {t("intelligence.pattern")}: {learning.pattern}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          {pendingRules.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {t("intelligence.awaitingApproval")}
              </h3>
              <div className="space-y-2">
                {pendingRules.map((rule: any) => (
                  <Card key={rule.id} className="bg-amber-500/5 border-amber-500/30">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{rule.ruleText}</p>
                          {rule.ruleTextAr && (
                            <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">{rule.ruleTextAr}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{rule.appliesTo}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(parseFloat(rule.confidence ?? "0.8") * 100)}% {t("intelligence.confidenceLabel")}
                            </span>
                            <div className="ms-auto flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-rose-500/50 text-rose-400 hover:bg-rose-500/10"
                                onClick={() => rejectRuleMut.mutate({ ruleId: rule.id })}
                                disabled={rejectRuleMut.isPending}
                              >
                                <XCircle className="w-3 h-3 me-1" /> {t("intelligence.rejectRule")}
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => approveRuleMut.mutate({ ruleId: rule.id })}
                                disabled={approveRuleMut.isPending}
                              >
                                <CheckCircle className="w-3 h-3 me-1" /> {t("intelligence.approveActivate")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeRules.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {t("intelligence.activeRulesLabel")}
              </h3>
              <div className="space-y-2">
                {activeRules.map((rule: any) => (
                  <Card key={rule.id} className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{rule.ruleText}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{rule.appliesTo}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {t("intelligence.appliedTimes").replace("{n}", rule.timesApplied ?? 0)}
                            </span>
                            {rule.approvedBy && (
                              <span className="text-xs text-muted-foreground">
                                · {t("intelligence.approvedBy")} {rule.approvedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {rules.length === 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t("intelligence.noRules")}</p>
                <p className="text-sm mt-1">{t("intelligence.noRulesDesc")}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Campaign Results Tab */}
        <TabsContent value="results" className="space-y-3 mt-4">
          {(campaignResults as any[]).length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t("intelligence.noCampaigns")}</p>
                <p className="text-sm mt-1">{t("intelligence.noCampaignsDesc")}</p>
                <Button size="sm" className="mt-4" onClick={() => setShowResultForm(true)}>
                  <Plus className="w-4 h-4 me-2" /> {t("intelligence.addFirstResult")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(campaignResults as any[]).map((result: any) => {
                const proposal = (proposals as any[]).find((p: any) => p.id === result.proposalId);
                const perfColor = {
                  exceeded: "text-emerald-400",
                  met: "text-blue-400",
                  below: "text-amber-400",
                  far_below: "text-rose-400",
                }[result.performanceVsPrediction as string] ?? "text-muted-foreground";

                return (
                  <Card key={result.id} className="bg-card/50 border-border/50">
                    <CardContent className="py-4 px-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">{proposal?.title ?? `Proposal #${result.proposalId}`}</p>
                          {result.performanceVsPrediction && (
                            <Badge className={`text-xs mt-1 ${perfColor} bg-transparent border-current`}>
                              {result.performanceVsPrediction.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        {result.learningExtracted && (
                          <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                            <Brain className="w-3 h-3 me-1" /> {t("intelligence.learningExtracted")}
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {result.actualRoas && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("intelligence.actualRoas")}</p>
                            <p className="text-sm font-semibold text-emerald-400">{parseFloat(result.actualRoas).toFixed(2)}x</p>
                            {result.predictedRoas && (
                              <p className="text-xs text-muted-foreground">vs {parseFloat(result.predictedRoas).toFixed(2)}x {t("intelligence.predicted")}</p>
                            )}
                          </div>
                        )}
                        {result.actualCpa && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("intelligence.actualCpa")}</p>
                            <p className="text-sm font-semibold">${parseFloat(result.actualCpa).toFixed(2)}</p>
                          </div>
                        )}
                        {result.actualSpend && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("intelligence.actualSpend")}</p>
                            <p className="text-sm font-semibold">${parseFloat(result.actualSpend).toLocaleString()}</p>
                          </div>
                        )}
                        {result.actualConversions && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("intelligence.actualConversions")}</p>
                            <p className="text-sm font-semibold">{result.actualConversions.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                      {result.notes && (
                        <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">{result.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Governance Tab */}
        <TabsContent value="governance" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                {t("intelligence.governancePolicy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "gov.noDecision", descKey: "gov.noDecisionDesc" },
                { key: "gov.noExecution", descKey: "gov.noExecutionDesc" },
                { key: "gov.noLearning", descKey: "gov.noLearningDesc" },
                { key: "gov.noExpansion", descKey: "gov.noExpansionDesc" },
                { key: "gov.noSelfMod", descKey: "gov.noSelfModDesc" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border/50">
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t(`intelligence.${item.key}`)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(`intelligence.${item.descKey}`)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Campaign Results Dialog */}
      <Dialog open={showResultForm} onOpenChange={setShowResultForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("intelligence.addCampaignResults")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("intelligence.proposal")}</Label>
              <Select value={resultForm.proposalId} onValueChange={v => setResultForm(f => ({ ...f, proposalId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("intelligence.selectProposal")} />
                </SelectTrigger>
                <SelectContent>
                  {(proposals as any[]).filter((p: any) => ["approved","in_execution","complete"].includes(p.status)).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("intelligence.actualRoas")}</Label>
                <Input placeholder="3.5" value={resultForm.actualRoas} onChange={e => setResultForm(f => ({ ...f, actualRoas: e.target.value }))} />
              </div>
              <div>
                <Label>{t("intelligence.actualCpa")}</Label>
                <Input placeholder="45.00" value={resultForm.actualCpa} onChange={e => setResultForm(f => ({ ...f, actualCpa: e.target.value }))} />
              </div>
              <div>
                <Label>{t("intelligence.actualSpend")}</Label>
                <Input placeholder="50000" value={resultForm.actualSpend} onChange={e => setResultForm(f => ({ ...f, actualSpend: e.target.value }))} />
              </div>
              <div>
                <Label>{t("intelligence.actualConversions")}</Label>
                <Input placeholder="1200" value={resultForm.actualConversions} onChange={e => setResultForm(f => ({ ...f, actualConversions: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{t("intelligence.performanceVsPrediction")}</Label>
              <Select value={resultForm.performanceVsPrediction} onValueChange={v => setResultForm(f => ({ ...f, performanceVsPrediction: v as any }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("general.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exceeded">{t("intelligence.exceeded")}</SelectItem>
                  <SelectItem value="met">{t("intelligence.met")}</SelectItem>
                  <SelectItem value="below">{t("intelligence.below")}</SelectItem>
                  <SelectItem value="far_below">{t("intelligence.farBelow")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("intelligence.notes")}</Label>
              <Textarea
                placeholder={t("intelligence.notesPlaceholder")}
                value={resultForm.notes}
                onChange={e => setResultForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowResultForm(false)}>{t("general.cancel")}</Button>
              <Button
                onClick={() => {
                  if (!resultForm.proposalId) { toast.error(t("general.required")); return; }
                  saveCampaignResultMut.mutate({
                    companyId,
                    proposalId: parseInt(resultForm.proposalId),
                    actualRoas: resultForm.actualRoas ? parseFloat(resultForm.actualRoas) : undefined,
                    actualCpa: resultForm.actualCpa ? parseFloat(resultForm.actualCpa) : undefined,
                    actualSpend: resultForm.actualSpend ? parseFloat(resultForm.actualSpend) : undefined,
                    actualConversions: resultForm.actualConversions ? parseInt(resultForm.actualConversions) : undefined,
                    performanceVsPrediction: resultForm.performanceVsPrediction || undefined,
                    notes: resultForm.notes || undefined,
                  });
                }}
                disabled={saveCampaignResultMut.isPending}
              >
                {saveCampaignResultMut.isPending ? t("intelligence.saving") : t("intelligence.saveAndExtract")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
