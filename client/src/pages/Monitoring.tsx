import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, TrendingUp, TrendingDown, Building2,
  BarChart3, Zap, Loader2, CheckCircle,
} from "lucide-react";

function statusColor(status: string) {
  if (status === "on_track") return "text-green-400";
  if (status === "warning") return "text-amber-400";
  if (status === "critical") return "text-red-400";
  if (status === "paused") return "text-slate-400";
  return "text-slate-400";
}

function statusBg(status: string) {
  if (status === "on_track") return "bg-green-500/10 border-green-500/20";
  if (status === "warning") return "bg-amber-500/10 border-amber-500/20";
  if (status === "critical") return "bg-red-500/10 border-red-500/20";
  if (status === "paused") return "bg-slate-500/10 border-slate-500/20";
  return "bg-slate-500/10 border-slate-500/20";
}

function statusBadgeClass(status: string) {
  if (status === "on_track") return "bg-green-500/20 text-green-400";
  if (status === "warning") return "bg-amber-500/20 text-amber-400";
  if (status === "critical") return "bg-red-500/20 text-red-400";
  if (status === "paused") return "bg-slate-500/20 text-slate-400";
  return "bg-slate-500/20 text-slate-400";
}

export default function Monitoring() {
  const { t, lang } = useI18n();
  const { currentCompany: activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? 0;

  const utils = trpc.useUtils();

  const { data: snapshots = [], isLoading } = trpc.monitoring.getLatest.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const handleRunAnalysis = () => {
    if (!activeCompany) return;
    utils.monitoring.getLatest.invalidate({ companyId });
    toast.success(lang === "ar" ? "تم تحديث البيانات" : "Data refreshed");
  };

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

  const typedSnapshots = (snapshots as unknown) as Array<{
    id: number;
    companyId: number;
    entityType: string;
    entityId?: string | null;
    platform: string;
    metrics?: unknown;
    impressions?: number | null;
    clicks?: number | null;
    spend?: number | null;
    conversions?: number | null;
    revenue?: number | null;
    ctr?: number | null;
    cpa?: number | null;
    roas?: number | null;
    status: string;
    alerts?: Array<{ message: string }> | null;
    createdAt?: string;
  }>;

  const alertSnapshots = typedSnapshots.filter((s) => Array.isArray(s.alerts) && s.alerts.length > 0);
  const onTrackCount = typedSnapshots.filter((s) => s.status === "on_track").length;
  const warningCount = typedSnapshots.filter((s) => s.status === "warning").length;
  const criticalCount = typedSnapshots.filter((s) => s.status === "critical").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            {t("nav.monitoring")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "ar" ? "مراقبة الأداء التسويقي في الوقت الفعلي" : "Real-time marketing performance tracking"}
          </p>
        </div>
        <Button
          onClick={handleRunAnalysis}
          className="bg-indigo-500 hover:bg-indigo-600"
        >
          <Zap className="w-4 h-4 me-2" />
          {lang === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{onTrackCount}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "على المسار" : "On Track"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{warningCount}</p>
              <p className="text-xs text-muted-foreground">{t("general.warning")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">{t("general.critical")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{typedSnapshots.length}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "إجمالي المقاطع" : "Total Snapshots"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts Banner */}
      {alertSnapshots.length > 0 && (
        <Card className="bg-red-500/5 border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {lang === "ar" ? "تنبيهات نشطة" : "Active Alerts"} ({alertSnapshots.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertSnapshots.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-300">{a.entityType} — {a.platform}</p>
                  {Array.isArray(a.alerts) && a.alerts.map((alert, i) => (
                    <p key={i} className="text-xs text-red-400/80 mt-0.5">{alert.message}</p>
                  ))}
                </div>
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs shrink-0">
                  {a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Snapshots Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            {lang === "ar" ? "مقاطع الأداء" : "Performance Snapshots"}
            <Badge className="ms-2 bg-indigo-500/20 text-indigo-400">{typedSnapshots.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : typedSnapshots.length === 0 ? (
            <div className="text-center py-10">
              <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t("general.noData")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-start py-2 px-3 font-medium">{lang === "ar" ? "النوع" : "Entity Type"}</th>
                    <th className="text-start py-2 px-3 font-medium">{lang === "ar" ? "المنصة" : "Platform"}</th>
                    <th className="text-start py-2 px-3 font-medium">CTR</th>
                    <th className="text-start py-2 px-3 font-medium">ROAS</th>
                    <th className="text-start py-2 px-3 font-medium">CPA</th>
                    <th className="text-start py-2 px-3 font-medium">{lang === "ar" ? "تحويلات" : "Conversions"}</th>
                    <th className="text-start py-2 px-3 font-medium">{t("general.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {typedSnapshots.map((s) => (
                    <tr
                      key={s.id}
                      className={`border-b border-border/40 hover:bg-white/5 transition-colors ${Array.isArray(s.alerts) && s.alerts.length > 0 ? "bg-red-500/5" : ""}`}
                    >
                      <td className="py-2.5 px-3 font-medium">{s.entityType}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{s.platform}</td>
                      <td className="py-2.5 px-3">{s.ctr != null ? `${s.ctr}%` : "—"}</td>
                      <td className="py-2.5 px-3">{s.roas != null ? String(s.roas) : "—"}</td>
                      <td className="py-2.5 px-3">{s.cpa != null ? String(s.cpa) : "—"}</td>
                      <td className="py-2.5 px-3">{s.conversions != null ? String(s.conversions) : "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${statusBg(s.status)} ${statusColor(s.status)}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
