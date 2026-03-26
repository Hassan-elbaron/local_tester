import { useState } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search, AlertTriangle, Building2, Loader2, CheckCircle,
  FileText, Globe, Hash, Layers,
} from "lucide-react";

function scoreColor(score: number) {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number) {
  if (score >= 70) return "border-green-500/30 bg-green-500/10";
  if (score >= 40) return "border-amber-500/30 bg-amber-500/10";
  return "border-red-500/30 bg-red-500/10";
}

function severityBadgeClass(severity: string) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-amber-500/20 text-amber-400",
    low: "bg-blue-500/20 text-blue-400",
  };
  return map[severity] ?? "bg-slate-500/20 text-slate-400";
}

function issueTypeIcon(type: string) {
  if (type === "technical") return <Layers className="w-4 h-4 text-purple-400" />;
  if (type === "on_page") return <FileText className="w-4 h-4 text-blue-400" />;
  if (type === "content") return <Hash className="w-4 h-4 text-indigo-400" />;
  if (type === "keywords") return <Search className="w-4 h-4 text-amber-400" />;
  return <Globe className="w-4 h-4 text-slate-400" />;
}

type IssueType = "technical" | "on_page" | "content" | "keywords";

export default function SeoPage() {
  const { t, lang } = useI18n();
  const { currentCompany: activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? 0;
  const [activeGroup, setActiveGroup] = useState<IssueType | "all">("all");

  const utils = trpc.useUtils();

  const { data: audit, isLoading } = trpc.seo.getLatest.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const runAuditMut = trpc.seo.runAudit.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "اكتمل تدقيق SEO" : "SEO audit completed");
      utils.seo.getLatest.invalidate({ companyId });
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

  const typedAudit = audit as {
    id: number;
    companyId: number;
    auditType: string;
    score: number;
    issues: Array<{
      type: IssueType;
      severity: string;
      title: string;
      description: string;
      acknowledged: boolean;
    }>;
    createdAt?: string;
  } | null | undefined;

  const issues = typedAudit?.issues ?? [];
  const score = typedAudit?.score ?? 0;

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "medium" || i.severity === "high").length;
  const unacknowledged = issues.filter((i) => !i.acknowledged).length;

  const grouped: Record<IssueType | "all", typeof issues> = {
    all: issues,
    technical: issues.filter((i) => i.type === "technical"),
    on_page: issues.filter((i) => i.type === "on_page"),
    content: issues.filter((i) => i.type === "content"),
    keywords: issues.filter((i) => i.type === "keywords"),
  };

  const displayedIssues = grouped[activeGroup] ?? issues;

  const groupTabs: { key: IssueType | "all"; label: string }[] = [
    { key: "all", label: t("general.all") },
    { key: "technical", label: lang === "ar" ? "تقني" : "Technical" },
    { key: "on_page", label: lang === "ar" ? "داخل الصفحة" : "On-Page" },
    { key: "content", label: lang === "ar" ? "محتوى" : "Content" },
    { key: "keywords", label: lang === "ar" ? "كلمات مفتاحية" : "Keywords" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-400" />
            {lang === "ar" ? "محرك SEO" : "SEO Engine"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "ar" ? "تحليل وتحسين محركات البحث" : "Search engine optimization analysis and recommendations"}
          </p>
        </div>
        <Button
          onClick={() => runAuditMut.mutate({ companyId, auditType: "full" })}
          disabled={runAuditMut.isPending}
          className="bg-indigo-500 hover:bg-indigo-600"
        >
          {runAuditMut.isPending
            ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
            : <Search className="w-4 h-4 me-2" />}
          {lang === "ar" ? "تشغيل تدقيق SEO" : "Run SEO Audit"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !typedAudit ? (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {lang === "ar" ? "لا يوجد تدقيق حتى الآن. ابدأ التدقيق لرؤية النتائج." : "No audit yet. Run an audit to see results."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Score + Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={`border md:col-span-1 ${scoreBg(score)}`}>
              <CardContent className="p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t("general.score")}</p>
                <p className={`text-5xl font-bold ${scoreColor(score)}`}>{score}</p>
                <p className={`text-xs mt-1 ${scoreColor(score)}`}>
                  {score >= 70
                    ? (lang === "ar" ? "ممتاز" : "Excellent")
                    : score >= 40
                      ? (lang === "ar" ? "بحاجة للتحسين" : "Needs Work")
                      : (lang === "ar" ? "حرج" : "Critical")}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/5 border-red-500/20">
              <CardContent className="p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t("general.critical")}</p>
                <p className="text-3xl font-bold text-red-400">{criticalCount}</p>
                <p className="text-xs text-muted-foreground mt-1">{lang === "ar" ? "مشكلة حرجة" : "Critical Issues"}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t("general.warning")}</p>
                <p className="text-3xl font-bold text-amber-400">{warningCount}</p>
                <p className="text-xs text-muted-foreground mt-1">{lang === "ar" ? "تحذيرات" : "Warnings"}</p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-500/5 border-indigo-500/20">
              <CardContent className="p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">{lang === "ar" ? "غير مؤكد" : "Unreviewed"}</p>
                <p className="text-3xl font-bold text-indigo-400">{unacknowledged}</p>
                <p className="text-xs text-muted-foreground mt-1">{lang === "ar" ? "بحاجة لمراجعة" : "Needs Review"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Issues Section */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  {lang === "ar" ? "المشكلات" : "Issues"} ({issues.length})
                </CardTitle>
              </div>
              {/* Group Filter Tabs */}
              <div className="flex gap-1 mt-3 flex-wrap">
                {groupTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveGroup(tab.key)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      activeGroup === tab.key
                        ? "bg-indigo-500 text-white"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                    {tab.key !== "all" && (
                      <span className="ms-1 opacity-70">({grouped[tab.key]?.length ?? 0})</span>
                    )}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {displayedIssues.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    {lang === "ar" ? "لا توجد مشكلات في هذه الفئة" : "No issues in this category"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pe-1">
                  {displayedIssues.map((issue, idx) => {
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border transition-colors ${
                          issue.acknowledged
                            ? "bg-muted/20 border-border/30 opacity-60"
                            : "bg-muted/40 border-border/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">{issueTypeIcon(issue.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className={severityBadgeClass(issue.severity)}>{issue.severity}</Badge>
                              <Badge className="bg-slate-500/20 text-slate-400 capitalize">
                                {issue.type.replace("_", " ")}
                              </Badge>
                              {issue.acknowledged && (
                                <Badge className="bg-green-500/20 text-green-400">
                                  <CheckCircle className="w-3 h-3 me-1" />
                                  {lang === "ar" ? "مؤكد" : "Acknowledged"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">{issue.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
