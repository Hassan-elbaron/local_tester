import { useState } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Shield, ScanLine, Building2, Loader2, ThumbsUp, ThumbsDown,
  Minus, AlertTriangle, CheckCircle, MessageSquare,
} from "lucide-react";

function sentimentColor(sentiment: string) {
  if (sentiment === "positive") return "bg-green-500/20 text-green-400";
  if (sentiment === "negative") return "bg-red-500/20 text-red-400";
  return "bg-slate-500/20 text-slate-400";
}

function urgencyColor(urgency: string) {
  if (urgency === "high" || urgency === "immediate") return "bg-red-500/20 text-red-400";
  if (urgency === "medium") return "bg-amber-500/20 text-amber-400";
  return "bg-slate-500/20 text-slate-400";
}

function healthScoreColor(score: number) {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function healthScoreBg(score: number) {
  if (score >= 70) return "border-green-500/30 bg-green-500/5";
  if (score >= 40) return "border-amber-500/30 bg-amber-500/5";
  return "border-red-500/30 bg-red-500/5";
}

export default function BrandPage() {
  const { t, lang } = useI18n();
  const { currentCompany: activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? 0;
  const [sentimentFilter, setSentimentFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");

  const utils = trpc.useUtils();

  const { data: mentions = [], isLoading: loadingMentions } = trpc.brand.getMentions.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const { data: health, isLoading: loadingHealth } = trpc.brand.analyzeHealth.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const scanMut = trpc.brand.scan.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم فحص الذكر بنجاح" : "Mentions scan completed");
      utils.brand.getMentions.invalidate({ companyId });
      utils.brand.analyzeHealth.invalidate({ companyId });
    },
    onError: (e) => toast.error(e.message ?? t("general.error")),
  });

  const reviewMut = trpc.brand.review.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تمت مراجعة الذكر" : "Mention reviewed");
      utils.brand.getMentions.invalidate({ companyId });
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

  const typedMentions = mentions as Array<{
    id: number;
    source: string;
    sentiment: string;
    isUrgent: boolean;
    content: string;
    isReviewed: boolean;
  }>;

  const typedHealth = health as { score: number; summary: string; riskLevel: string } | null | undefined;
  const healthScore = typedHealth?.score ?? 0;

  const filteredMentions =
    sentimentFilter === "all"
      ? typedMentions
      : typedMentions.filter((m) => m.sentiment === sentimentFilter);

  const urgentMentions = typedMentions.filter((m) => m.isUrgent === true);

  const positiveCount = typedMentions.filter((m) => m.sentiment === "positive").length;
  const negativeCount = typedMentions.filter((m) => m.sentiment === "negative").length;
  const neutralCount = typedMentions.filter((m) => m.sentiment === "neutral").length;

  const sentimentTabs = [
    { key: "all" as const, label: t("general.all"), count: typedMentions.length },
    { key: "positive" as const, label: lang === "ar" ? "إيجابي" : "Positive", count: positiveCount },
    { key: "negative" as const, label: lang === "ar" ? "سلبي" : "Negative", count: negativeCount },
    { key: "neutral" as const, label: lang === "ar" ? "محايد" : "Neutral", count: neutralCount },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-400" />
            {lang === "ar" ? "حارس العلامة التجارية" : "Brand Guardian"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "ar" ? "مراقبة سمعة العلامة التجارية والمشاعر" : "Monitor brand reputation and sentiment"}
          </p>
        </div>
        <Button
          onClick={() => scanMut.mutate({ companyId })}
          disabled={scanMut.isPending}
          className="bg-indigo-500 hover:bg-indigo-600"
        >
          {scanMut.isPending
            ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
            : <ScanLine className="w-4 h-4 me-2" />}
          {lang === "ar" ? "فحص الذكر" : "Scan Mentions"}
        </Button>
      </div>

      {/* Health Score + Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`border md:col-span-1 ${healthScoreBg(healthScore)}`}>
          <CardContent className="p-5">
            {loadingHealth ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <p className="text-xs text-muted-foreground">{lang === "ar" ? "صحة العلامة" : "Brand Health"}</p>
                </div>
                <p className={`text-5xl font-bold ${healthScoreColor(healthScore)}`}>{healthScore}</p>
                {typedHealth?.riskLevel && (
                  <Badge className={`mt-2 ${urgencyColor(typedHealth.riskLevel)}`}>
                    {typedHealth.riskLevel}
                  </Badge>
                )}
                {typedHealth?.summary && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{typedHealth.summary}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{urgentMentions.length}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "عاجل" : "Urgent"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
              <ThumbsUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{positiveCount}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "إيجابي" : "Positive"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <ThumbsDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{negativeCount}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "سلبي" : "Negative"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentions Section */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              {lang === "ar" ? "الذكر" : "Mentions"} ({typedMentions.length})
            </CardTitle>
          </div>
          {/* Sentiment Filter */}
          <div className="flex gap-1 mt-3 flex-wrap">
            {sentimentTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSentimentFilter(tab.key)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  sentimentFilter === tab.key
                    ? "bg-indigo-500 text-white"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loadingMentions ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : filteredMentions.length === 0 ? (
            <div className="text-center py-10">
              <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {lang === "ar" ? "لا يوجد ذكر في هذه الفئة" : "No mentions in this category"}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pe-1">
              {filteredMentions.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    m.isUrgent
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-border/40 bg-muted/30"
                  } ${m.isReviewed ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge className={sentimentColor(m.sentiment)}>
                          {m.sentiment === "positive" && <ThumbsUp className="w-3 h-3 me-1" />}
                          {m.sentiment === "negative" && <ThumbsDown className="w-3 h-3 me-1" />}
                          {m.sentiment === "neutral" && <Minus className="w-3 h-3 me-1" />}
                          {m.sentiment}
                        </Badge>
                        <Badge className="bg-slate-500/20 text-slate-400 capitalize">{m.source}</Badge>
                        {m.isUrgent && (
                          <Badge className="bg-red-500/20 text-red-400">
                            <AlertTriangle className="w-3 h-3 me-1" />
                            {lang === "ar" ? "عاجل" : "Urgent"}
                          </Badge>
                        )}
                        {m.isReviewed && (
                          <Badge className="bg-green-500/20 text-green-400">
                            <CheckCircle className="w-3 h-3 me-1" />
                            {lang === "ar" ? "تمت المراجعة" : "Reviewed"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{m.content}</p>
                    </div>
                    {!m.isReviewed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs"
                        onClick={() => reviewMut.mutate({ companyId, mentionId: m.id })}
                        disabled={reviewMut.isPending}
                      >
                        {reviewMut.isPending
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <CheckCircle className="w-3 h-3 me-1" />}
                        {lang === "ar" ? "مراجعة" : "Review"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
