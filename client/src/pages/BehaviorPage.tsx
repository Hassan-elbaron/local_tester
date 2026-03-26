import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Activity, Building2, Loader2, Zap, Eye, Clock,
  TrendingUp, MousePointer, CheckCircle, AlertTriangle,
} from "lucide-react";

function severityColor(severity: string) {
  if (severity === "critical" || severity === "high") return "text-red-400 bg-red-500/20";
  if (severity === "medium") return "text-amber-400 bg-amber-500/20";
  return "text-blue-400 bg-blue-500/20";
}

function insightTypeColor(type: string) {
  const map: Record<string, string> = {
    drop_off: "bg-red-500/20 text-red-400",
    friction_point: "bg-orange-500/20 text-orange-400",
    rage_click_zone: "bg-purple-500/20 text-purple-400",
    dead_click_zone: "bg-slate-500/20 text-slate-400",
    scroll_depth_issue: "bg-blue-500/20 text-blue-400",
    cta_performance: "bg-green-500/20 text-green-400",
    path_analysis: "bg-indigo-500/20 text-indigo-400",
    ux_issue: "bg-amber-500/20 text-amber-400",
  };
  return map[type] ?? "bg-slate-500/20 text-slate-400";
}

export default function BehaviorPage() {
  const { t, lang } = useI18n();
  const { currentCompany: activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? 0;

  const utils = trpc.useUtils();

  const { data: insights = [], isLoading: loadingInsights } = trpc.behavior.getInsights.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const { data: sessions = [], isLoading: loadingSessions } = trpc.behavior.getSessions.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const runAnalysisMut = trpc.behavior.analyze.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "اكتمل تحليل السلوك" : "Behavior analysis completed");
      utils.behavior.getInsights.invalidate({ companyId });
      utils.behavior.getSessions.invalidate({ companyId });
    },
    onError: (e) => toast.error(e.message ?? t("general.error")),
  });

  const updateInsightMut = trpc.behavior.updateInsightStatus.useMutation({
    onSuccess: () => {
      toast.success(t("general.success"));
      utils.behavior.getInsights.invalidate({ companyId });
    },
    onError: (e) => toast.error(e.message ?? t("general.error")),
  });

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("company.noSelected")}</h2>
          <p className="text-muted-foreground text-sm">{t("company.noSelectedDesc")}</p>
        </div>
      </div>
    );
  }

  const typedInsights = (insights as unknown) as Array<{
    id: number;
    insightType: string;
    description: string;
    recommendation: string;
    severity: string;
    status: string;
    createdAt?: string;
  }>;

  const typedSessions = (sessions as unknown) as Array<{
    id: number;
    sessionId?: string;
    startPage?: string | null;
    exitPage?: string | null;
    pageViews?: number;
    duration?: number | null;
    scrollDepthAvg?: string | null;
    converted?: boolean;
    createdAt?: string;
  }>;

  const highImpact = typedInsights.filter((i) => i.severity === "high" || i.severity === "critical").length;
  const openInsights = typedInsights.filter((i) => i.status !== "fixed" && i.status !== "dismissed").length;
  const avgDuration = typedSessions.length
    ? Math.round(typedSessions.reduce((s, sess) => s + (sess.duration ?? 0), 0) / typedSessions.length)
    : 0;
  const convertedRate = typedSessions.length
    ? Math.round((typedSessions.filter((s) => s.converted).length / typedSessions.length) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MousePointer className="w-6 h-6 text-indigo-400" />
            {lang === "ar" ? "ذكاء السلوك وتجربة المستخدم" : "Behavior Intelligence"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "ar" ? "تحليل سلوك المستخدم وتحسين تجربته" : "User behavior analysis and UX optimization"}
          </p>
        </div>
        <Button
          onClick={() => runAnalysisMut.mutate({ companyId })}
          disabled={runAnalysisMut.isPending}
          className="bg-indigo-500 hover:bg-indigo-600"
        >
          {runAnalysisMut.isPending
            ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
            : <Zap className="w-4 h-4 me-2" />}
          {lang === "ar" ? "تشغيل التحليل" : "Run Analysis"}
        </Button>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{typedSessions.length}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "إجمالي الجلسات" : "Total Sessions"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{avgDuration}s</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "متوسط المدة" : "Avg Duration"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{convertedRate}%</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "معدل التحويل" : "Conversion Rate"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{highImpact}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "رؤى عالية التأثير" : "High Impact"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Insights / Sessions */}
      <Tabs defaultValue="insights">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="insights">
            {lang === "ar" ? "الرؤى" : "Insights"} ({openInsights})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            {lang === "ar" ? "الجلسات" : "Sessions"} ({typedSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-4">
          {loadingInsights ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : typedInsights.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t("general.noData")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {typedInsights.map((insight) => (
                <Card key={insight.id} className={`bg-card border-border ${insight.status === "fixed" ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge className={insightTypeColor(insight.insightType)}>{insight.insightType.replace(/_/g, " ")}</Badge>
                          <Badge className={severityColor(insight.severity)}>{insight.severity} {lang === "ar" ? "خطورة" : "severity"}</Badge>
                          {insight.status === "fixed" && (
                            <Badge className="bg-green-500/20 text-green-400">
                              <CheckCircle className="w-3 h-3 me-1" />
                              {lang === "ar" ? "محلول" : "Fixed"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1">
                          {lang === "ar" ? "الوصف: " : "Description: "}{insight.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-indigo-400">{lang === "ar" ? "التوصية: " : "Recommendation: "}</span>
                          {insight.recommendation}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {insight.status !== "fixed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={() => updateInsightMut.mutate({ companyId, insightId: insight.id, status: "fixed" })}
                            disabled={updateInsightMut.isPending}
                          >
                            <CheckCircle className="w-3 h-3 me-1" />
                            {lang === "ar" ? "حل" : "Fix"}
                          </Button>
                        )}
                        {insight.status === "new" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-2"
                            onClick={() => updateInsightMut.mutate({ companyId, insightId: insight.id, status: "acknowledged" })}
                            disabled={updateInsightMut.isPending}
                          >
                            {lang === "ar" ? "تأكيد" : "Ack"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          {loadingSessions ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : typedSessions.length === 0 ? (
            <div className="text-center py-12">
              <Eye className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t("general.noData")}</p>
            </div>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-start py-2.5 px-4 font-medium">{lang === "ar" ? "صفحة البداية" : "Start Page"}</th>
                        <th className="text-start py-2.5 px-4 font-medium">{lang === "ar" ? "صفحة الخروج" : "Exit Page"}</th>
                        <th className="text-start py-2.5 px-4 font-medium">{lang === "ar" ? "المدة" : "Duration"}</th>
                        <th className="text-start py-2.5 px-4 font-medium">{lang === "ar" ? "الصفحات" : "Page Views"}</th>
                        <th className="text-start py-2.5 px-4 font-medium">{lang === "ar" ? "تحويل" : "Converted"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typedSessions.slice(0, 50).map((sess) => (
                        <tr key={sess.id} className="border-b border-border/40 hover:bg-white/5 transition-colors">
                          <td className="py-2 px-4 text-muted-foreground max-w-xs truncate">{sess.startPage ?? "/"}</td>
                          <td className="py-2 px-4 text-muted-foreground max-w-xs truncate">{sess.exitPage ?? "—"}</td>
                          <td className="py-2 px-4">{sess.duration != null ? `${sess.duration}s` : "—"}</td>
                          <td className="py-2 px-4">{sess.pageViews ?? "—"}</td>
                          <td className="py-2 px-4">
                            {sess.converted ? (
                              <Badge className="bg-green-500/20 text-green-400 text-xs">{lang === "ar" ? "نعم" : "Yes"}</Badge>
                            ) : (
                              <Badge className="bg-slate-500/20 text-slate-400 text-xs">{lang === "ar" ? "لا" : "No"}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
