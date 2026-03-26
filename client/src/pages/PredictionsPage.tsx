import { useState } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Brain, Building2, Loader2, Zap, TrendingUp, AlertTriangle,
  Lightbulb, AlertCircle, Coffee, CheckCircle, Activity,
} from "lucide-react";

type PredictionType =
  | "trend_detection"
  | "anomaly_detection"
  | "fatigue_detection"
  | "conversion_drop"
  | "funnel_issue"
  | "opportunity_signal"
  | "churn_risk";

function typeConfig(type: string): { color: string; bg: string; borderColor: string; icon: React.ReactNode } {
  const configs: Record<string, { color: string; bg: string; borderColor: string; icon: React.ReactNode }> = {
    trend_detection: {
      color: "text-blue-400",
      bg: "bg-blue-500/20",
      borderColor: "border-blue-500/30",
      icon: <TrendingUp className="w-4 h-4 text-blue-400" />,
    },
    anomaly_detection: {
      color: "text-amber-400",
      bg: "bg-amber-500/20",
      borderColor: "border-amber-500/30",
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    },
    opportunity_signal: {
      color: "text-green-400",
      bg: "bg-green-500/20",
      borderColor: "border-green-500/30",
      icon: <Lightbulb className="w-4 h-4 text-green-400" />,
    },
    churn_risk: {
      color: "text-red-400",
      bg: "bg-red-500/20",
      borderColor: "border-red-500/30",
      icon: <AlertCircle className="w-4 h-4 text-red-400" />,
    },
    fatigue_detection: {
      color: "text-orange-400",
      bg: "bg-orange-500/20",
      borderColor: "border-orange-500/30",
      icon: <Coffee className="w-4 h-4 text-orange-400" />,
    },
    conversion_drop: {
      color: "text-rose-400",
      bg: "bg-rose-500/20",
      borderColor: "border-rose-500/30",
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
    },
    funnel_issue: {
      color: "text-purple-400",
      bg: "bg-purple-500/20",
      borderColor: "border-purple-500/30",
      icon: <Activity className="w-4 h-4 text-purple-400" />,
    },
  };
  return configs[type] ?? {
    color: "text-slate-400",
    bg: "bg-slate-500/20",
    borderColor: "border-slate-500/30",
    icon: <Activity className="w-4 h-4 text-slate-400" />,
  };
}

function confidenceBar(confidence: number | string) {
  const raw = typeof confidence === "string" ? parseFloat(confidence) : confidence;
  const pct = Math.min(100, Math.max(0, raw <= 1 ? Math.round(raw * 100) : Math.round(raw)));
  const color = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-end">{pct}%</span>
    </div>
  );
}

const TYPE_LABELS: Record<PredictionType, { en: string; ar: string }> = {
  trend_detection: { en: "Trend", ar: "اتجاه" },
  anomaly_detection: { en: "Anomaly", ar: "شذوذ" },
  opportunity_signal: { en: "Opportunity", ar: "فرصة" },
  churn_risk: { en: "Churn Risk", ar: "مخاطرة تسرب" },
  fatigue_detection: { en: "Fatigue", ar: "إرهاق" },
  conversion_drop: { en: "Conv. Drop", ar: "انخفاض تحويل" },
  funnel_issue: { en: "Funnel Issue", ar: "مشكلة قمع" },
};

export default function PredictionsPage() {
  const { t, lang } = useI18n();
  const { currentCompany: activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? 0;
  const [typeFilter, setTypeFilter] = useState<PredictionType | "all">("all");

  const utils = trpc.useUtils();

  const { data: predictions = [], isLoading } = trpc.predictive.getPredictions.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const runAnalysisMut = trpc.predictive.runAnalysis.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "اكتمل التحليل التنبؤي" : "Predictive analysis completed");
      utils.predictive.getPredictions.invalidate({ companyId });
    },
    onError: (e) => toast.error(e.message ?? t("general.error")),
  });

  const acknowledgeMut = trpc.predictive.acknowledge.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم تأكيد التنبؤ" : "Prediction acknowledged");
      utils.predictive.getPredictions.invalidate({ companyId });
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

  const typedPredictions = (predictions as unknown) as Array<{
    id: number;
    predictionType: PredictionType;
    title: string;
    description: string;
    confidence: number | string;
    urgency: string;
    expectedImpact?: string | null;
    suggestedAction?: string | null;
    status: string;
    createdAt?: string;
  }>;

  const activePredictions = typedPredictions.filter((p) => p.status === "active");

  const typeCounts = typedPredictions.reduce<Record<string, number>>((acc, p) => {
    acc[p.predictionType] = (acc[p.predictionType] ?? 0) + 1;
    return acc;
  }, {});

  const displayedPredictions =
    typeFilter === "all"
      ? typedPredictions
      : typedPredictions.filter((p) => p.predictionType === typeFilter);

  const allTypes: PredictionType[] = [
    "trend_detection",
    "anomaly_detection",
    "opportunity_signal",
    "churn_risk",
    "fatigue_detection",
    "conversion_drop",
    "funnel_issue",
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-400" />
            {lang === "ar" ? "الذكاء التنبؤي" : "Predictive Intelligence"}
            {activePredictions.length > 0 && (
              <Badge className="bg-indigo-500/20 text-indigo-400 ms-1">{activePredictions.length}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "ar" ? "التنبؤ بالاتجاهات والمخاطر والفرص" : "Forecast trends, risks, and opportunities"}
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
          {lang === "ar" ? "تشغيل التحليل التنبؤي" : "Run Predictive Analysis"}
        </Button>
      </div>

      {/* Type Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {allTypes.map((type) => {
          const cfg = typeConfig(type);
          const label = TYPE_LABELS[type][lang === "ar" ? "ar" : "en"];
          return (
            <Card
              key={type}
              className={`bg-card border cursor-pointer transition-all hover:scale-[1.02] ${
                typeFilter === type ? `${cfg.borderColor} ${cfg.bg}` : "border-border"
              }`}
              onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
            >
              <CardContent className="p-3 text-center">
                <div className="flex justify-center mb-1">{cfg.icon}</div>
                <p className={`text-xl font-bold ${cfg.color}`}>{typeCounts[type] ?? 0}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Type Filter Pills */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            typeFilter === "all"
              ? "bg-indigo-500 text-white"
              : "bg-muted/40 text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("general.all")} ({typedPredictions.length})
        </button>
        {allTypes.map((type) => {
          const cfg = typeConfig(type);
          const label = TYPE_LABELS[type][lang === "ar" ? "ar" : "en"];
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                typeFilter === type
                  ? `${cfg.bg} ${cfg.color}`
                  : "bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} ({typeCounts[type] ?? 0})
            </button>
          );
        })}
      </div>

      {/* Predictions List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : displayedPredictions.length === 0 ? (
        <div className="text-center py-14">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{t("general.noData")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedPredictions.map((pred) => {
            const cfg = typeConfig(pred.predictionType);
            const isAcknowledged = pred.status === "acknowledged" || pred.status === "resolved";
            return (
              <Card
                key={pred.id}
                className={`bg-card border transition-colors ${
                  isAcknowledged ? "opacity-50 border-border/30" : cfg.borderColor
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-2 rounded-lg ${cfg.bg} shrink-0`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={`${cfg.bg} ${cfg.color}`}>
                          {TYPE_LABELS[pred.predictionType]?.[lang === "ar" ? "ar" : "en"] ?? pred.predictionType}
                        </Badge>
                        <Badge className={
                          pred.urgency === "immediate" || pred.urgency === "high"
                            ? "bg-red-500/20 text-red-400"
                            : pred.urgency === "medium"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-blue-500/20 text-blue-400"
                        }>
                          {pred.urgency} {lang === "ar" ? "أولوية" : "urgency"}
                        </Badge>
                        {isAcknowledged && (
                          <Badge className="bg-green-500/20 text-green-400">
                            <CheckCircle className="w-3 h-3 me-1" />
                            {lang === "ar" ? "مؤكد" : "Acknowledged"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold mb-1">{pred.title}</p>
                      <p className="text-xs text-muted-foreground mb-2">{pred.description}</p>
                      <div className="max-w-48">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t("general.confidence")}
                        </p>
                        {confidenceBar(pred.confidence)}
                      </div>
                    </div>
                    {!isAcknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs h-7 px-2"
                        onClick={() => acknowledgeMut.mutate({ companyId, predictionId: pred.id })}
                        disabled={acknowledgeMut.isPending}
                      >
                        {acknowledgeMut.isPending
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <CheckCircle className="w-3 h-3 me-1" />}
                        {lang === "ar" ? "تأكيد" : "Acknowledge"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
