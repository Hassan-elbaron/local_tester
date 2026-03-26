import { useState } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, Building2, Loader2, HelpCircle, MessageSquare,
  AlertCircle, CheckCircle, BarChart3, Lightbulb,
} from "lucide-react";

function categoryBadgeClass(category: string) {
  const map: Record<string, string> = {
    objection: "bg-orange-500/20 text-orange-400",
    faq: "bg-blue-500/20 text-blue-400",
    complaint: "bg-red-500/20 text-red-400",
    pre_sale_concern: "bg-amber-500/20 text-amber-400",
    post_sale_issue: "bg-purple-500/20 text-purple-400",
    support_theme: "bg-indigo-500/20 text-indigo-400",
    feature_request: "bg-green-500/20 text-green-400",
  };
  return map[category] ?? "bg-slate-500/20 text-slate-400";
}

function categoryIcon(category: string) {
  if (category === "objection") return <AlertCircle className="w-4 h-4 text-orange-400" />;
  if (category === "faq") return <HelpCircle className="w-4 h-4 text-blue-400" />;
  if (category === "complaint") return <MessageSquare className="w-4 h-4 text-red-400" />;
  return <Lightbulb className="w-4 h-4 text-indigo-400" />;
}

export default function CustomersPage() {
  const { t, lang } = useI18n();
  const { currentCompany: activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? 0;
  const [activeTab, setActiveTab] = useState<string>("all");
  const [extractText, setExtractText] = useState("");

  const utils = trpc.useUtils();

  const { data: issues = [], isLoading } = trpc.customer.getIssues.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const extractMut = trpc.customer.extractFromText.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم استخراج المشكلات" : "Issues extracted successfully");
      setExtractText("");
      utils.customer.getIssues.invalidate({ companyId });
    },
    onError: (e) => toast.error(e.message ?? t("general.error")),
  });

  const generateFaqsMut = trpc.customer.generateFaqs.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم توليد الأسئلة الشائعة" : "FAQs generated successfully");
      utils.customer.getIssues.invalidate({ companyId });
    },
    onError: (e) => toast.error(e.message ?? t("general.error")),
  });

  const updateStatusMut = trpc.customer.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t("general.success"));
      utils.customer.getIssues.invalidate({ companyId });
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

  const typedIssues = issues as Array<{
    id: number;
    issueType: string;
    content: string;
    frequency: number;
    status: string;
    companyId: number;
  }>;

  const issueTypes = ["objection", "faq", "complaint", "pre_sale_concern", "post_sale_issue", "support_theme", "feature_request"] as const;

  const counts: Record<string, number> = {
    all: typedIssues.length,
    objection: typedIssues.filter((i) => i.issueType === "objection").length,
    faq: typedIssues.filter((i) => i.issueType === "faq").length,
    complaint: typedIssues.filter((i) => i.issueType === "complaint").length,
    pre_sale_concern: typedIssues.filter((i) => i.issueType === "pre_sale_concern").length,
    post_sale_issue: typedIssues.filter((i) => i.issueType === "post_sale_issue").length,
    support_theme: typedIssues.filter((i) => i.issueType === "support_theme").length,
    feature_request: typedIssues.filter((i) => i.issueType === "feature_request").length,
  };

  const displayedIssues =
    activeTab === "all" ? typedIssues : typedIssues.filter((i) => i.issueType === activeTab);

  const tabs: { key: string; label: string }[] = [
    { key: "all", label: t("general.all") },
    { key: "objection", label: lang === "ar" ? "الاعتراضات" : "Objections" },
    { key: "faq", label: lang === "ar" ? "الأسئلة الشائعة" : "FAQs" },
    { key: "complaint", label: lang === "ar" ? "الشكاوى" : "Complaints" },
    { key: "pre_sale_concern", label: lang === "ar" ? "مخاوف ما قبل البيع" : "Pre-Sale" },
    { key: "post_sale_issue", label: lang === "ar" ? "مشكلات ما بعد البيع" : "Post-Sale" },
    { key: "feature_request", label: lang === "ar" ? "طلبات ميزات" : "Feature Req." },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            {lang === "ar" ? "ذكاء العملاء" : "Customer Intelligence"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "ar" ? "تحليل اعتراضات العملاء والأسئلة الشائعة والشكاوى" : "Analyze customer objections, FAQs, and complaints"}
          </p>
        </div>
        <Button
          onClick={() => generateFaqsMut.mutate({ companyId })}
          disabled={generateFaqsMut.isPending}
          className="bg-indigo-500 hover:bg-indigo-600"
        >
          {generateFaqsMut.isPending
            ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
            : <HelpCircle className="w-4 h-4 me-2" />}
          {lang === "ar" ? "توليد الأسئلة الشائعة" : "Generate FAQ Suggestions"}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.all}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "الإجمالي" : "Total"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{counts.objection}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "اعتراضات" : "Objections"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{counts.faq}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "أسئلة شائعة" : "FAQs"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{counts.complaint}</p>
              <p className="text-xs text-muted-foreground">{lang === "ar" ? "شكاوى" : "Complaints"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extract Issues Panel */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            {lang === "ar" ? "استخراج المشكلات من النص" : "Extract Issues from Text"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full h-24 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground"
            placeholder={lang === "ar" ? "الصق نص مراجعات العملاء أو محادثات الدعم هنا..." : "Paste customer reviews, support chats, or feedback text here..."}
            value={extractText}
            onChange={(e) => setExtractText(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              if (!extractText.trim()) return;
              extractMut.mutate({ companyId, text: extractText, source: "manual" });
            }}
            disabled={extractMut.isPending || !extractText.trim()}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {extractMut.isPending
              ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
              : <Lightbulb className="w-4 h-4 me-2" />}
            {lang === "ar" ? "استخراج المشكلات" : "Extract Issues"}
          </Button>
        </CardContent>
      </Card>

      {/* Issues List with Tab Filter */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            {lang === "ar" ? "قائمة المشكلات" : "Issues List"}
          </CardTitle>
          <div className="flex gap-1 mt-3 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  activeTab === tab.key
                    ? "bg-indigo-500 text-white"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label} ({counts[tab.key] ?? 0})
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : displayedIssues.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{t("general.noData")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-start py-2 px-3 font-medium">{t("general.type")}</th>
                    <th className="text-start py-2 px-3 font-medium">{lang === "ar" ? "المحتوى" : "Content"}</th>
                    <th className="text-start py-2 px-3 font-medium">{lang === "ar" ? "التكرار" : "Frequency"}</th>
                    <th className="text-start py-2 px-3 font-medium">{t("general.status")}</th>
                    <th className="text-start py-2 px-3 font-medium">{t("general.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedIssues.map((issue) => (
                    <tr key={issue.id} className="border-b border-border/40 hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {categoryIcon(issue.issueType)}
                          <Badge className={`${categoryBadgeClass(issue.issueType)} capitalize`}>
                            {issue.issueType.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <p className="text-sm truncate">{issue.content}</p>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {issue.frequency > 1 ? (
                          <Badge className="bg-purple-500/20 text-purple-400">{issue.frequency}x</Badge>
                        ) : (
                          <span className="text-muted-foreground">1</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                          issue.status === "resolved"
                            ? "bg-green-500/20 text-green-400"
                            : issue.status === "addressed"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-slate-500/20 text-slate-400"
                        }`}>
                          {issue.status ?? "open"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1">
                          {issue.status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2"
                              onClick={() => updateStatusMut.mutate({ companyId, issueId: issue.id, status: "resolved" })}
                              disabled={updateStatusMut.isPending}
                            >
                              <CheckCircle className="w-3 h-3 me-1" />
                              {lang === "ar" ? "حل" : "Resolve"}
                            </Button>
                          )}
                        </div>
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
