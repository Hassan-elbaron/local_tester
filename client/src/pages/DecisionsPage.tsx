import { useState } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Scale, Building2, Loader2, Zap, CheckCircle, XCircle,
  Clock, ChevronDown, ChevronUp, Lightbulb, Star,
} from "lucide-react";

function statusConfig(status: string) {
  if (status === "pending") return { color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" };
  if (status === "approved") return { color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30" };
  if (status === "rejected") return { color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" };
  if (status === "deferred") return { color: "text-slate-400", bg: "bg-slate-500/20", border: "border-slate-500/30" };
  return { color: "text-slate-400", bg: "bg-slate-500/20", border: "border-border" };
}

type DecisionAlternative = {
  option: string;
  tradeoff: string;
};

type Decision = {
  id: number;
  decisionType: string;
  recommendation: string | null;
  reason: string | null;
  confidence?: number | string | null;
  urgency?: string | null;
  expectedImpact?: unknown;
  alternatives: DecisionAlternative[] | null;
  humanNotes: string | null;
  status: string;
  createdAt?: string;
};

export default function DecisionsPage() {
  const { t, lang } = useI18n();
  const { currentCompany: activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? 0;
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [genContext, setGenContext] = useState("");
  const [showGenPanel, setShowGenPanel] = useState(false);

  const utils = trpc.useUtils();

  const { data: allDecisions = [], isLoading } = trpc.decisions.getAll.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const { data: pendingDecisions = [] } = trpc.decisions.getPending.useQuery(
    { companyId },
    { enabled: !!activeCompany }
  );

  const approveMut = trpc.decisions.approve.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تمت الموافقة على القرار" : "Decision approved");
      utils.decisions.getAll.invalidate({ companyId });
      utils.decisions.getPending.invalidate({ companyId });
    },
    onError: (e) => toast.error(e.message ?? t("general.error")),
  });

  const rejectMut = trpc.decisions.reject.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم رفض القرار" : "Decision rejected");
      utils.decisions.getAll.invalidate({ companyId });
      utils.decisions.getPending.invalidate({ companyId });
    },
    onError: (e) => toast.error(e.message ?? t("general.error")),
  });

  const deferMut = trpc.decisions.defer.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم تأجيل القرار" : "Decision deferred");
      utils.decisions.getAll.invalidate({ companyId });
      utils.decisions.getPending.invalidate({ companyId });
    },
    onError: (e) => toast.error(e.message ?? t("general.error")),
  });

  const generateMut = trpc.decisions.generate.useMutation({
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم توليد قرار جديد" : "New decision generated");
      setGenContext("");
      setShowGenPanel(false);
      utils.decisions.getAll.invalidate({ companyId });
      utils.decisions.getPending.invalidate({ companyId });
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

  const typedDecisions = (allDecisions as unknown) as Decision[];
  const typedPending = (pendingDecisions as unknown) as Decision[];
  const approvedDecisions = typedDecisions.filter((d) => d.status === "approved");

  const toggleExpand = (id: number) => setExpandedId(expandedId === id ? null : id);

  const renderDecisionCard = (decision: Decision, highlighted = false) => {
    const cfg = statusConfig(decision.status);
    const isExpanded = expandedId === decision.id;
    const alternatives: DecisionAlternative[] = Array.isArray(decision.alternatives) ? decision.alternatives : [];
    const isPending = decision.status === "pending";

    return (
      <Card
        key={decision.id}
        className={`bg-card border transition-all ${highlighted ? `${cfg.border} ${cfg.bg.replace("/20", "/5")}` : "border-border"}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge className={`${cfg.bg} ${cfg.color}`}>
                  {decision.status === "pending" && <Clock className="w-3 h-3 me-1" />}
                  {decision.status === "approved" && <CheckCircle className="w-3 h-3 me-1" />}
                  {decision.status === "rejected" && <XCircle className="w-3 h-3 me-1" />}
                  {decision.status === "deferred" && <Clock className="w-3 h-3 me-1" />}
                  {decision.status}
                </Badge>
                {decision.recommendation && (
                  <Badge className="bg-indigo-500/20 text-indigo-400">
                    <Star className="w-3 h-3 me-1" />
                    {lang === "ar" ? "توصية" : "Recommended"}
                  </Badge>
                )}
              </div>

              <p className="text-sm font-semibold mb-0.5 capitalize">{decision.decisionType.replace(/_/g, " ")}</p>
              {decision.reason && (
                <p className="text-xs text-muted-foreground">{decision.reason}</p>
              )}

              {decision.recommendation && (
                <p className="text-xs text-indigo-400 mt-1">
                  <span className="text-muted-foreground">{lang === "ar" ? "التوصية: " : "AI Recommendation: "}</span>
                  {decision.recommendation}
                </p>
              )}

              {/* Toggle Alternatives */}
              {alternatives.length > 0 && (
                <button
                  onClick={() => toggleExpand(decision.id)}
                  className="flex items-center gap-1 mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {lang === "ar" ? `${alternatives.length} بدائل` : `${alternatives.length} Alternatives`}
                </button>
              )}

              {/* Expanded Alternatives */}
              {isExpanded && alternatives.length > 0 && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {alternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-2"
                    >
                      <p className="text-sm font-medium">{alt.option}</p>
                      <p className="text-xs text-muted-foreground">{alt.tradeoff}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons for Pending */}
              {isPending && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-xs h-7"
                    onClick={() => approveMut.mutate({ companyId, decisionId: decision.id, notes: undefined })}
                    disabled={approveMut.isPending}
                  >
                    <CheckCircle className="w-3 h-3 me-1" />
                    {t("general.approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => deferMut.mutate({ companyId, decisionId: decision.id })}
                    disabled={deferMut.isPending}
                  >
                    <Clock className="w-3 h-3 me-1" />
                    {lang === "ar" ? "تأجيل" : "Defer"}
                  </Button>
                  <div className="flex gap-1 items-center">
                    <input
                      type="text"
                      className="h-7 bg-muted/30 border border-border rounded px-2 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-red-500"
                      placeholder={lang === "ar" ? "سبب الرفض..." : "Rejection reason..."}
                      value={rejectReason[decision.id] ?? ""}
                      onChange={(e) =>
                        setRejectReason((prev) => ({ ...prev, [decision.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() =>
                        rejectMut.mutate({
                          companyId,
                          decisionId: decision.id,
                          notes: rejectReason[decision.id] ?? "",
                        })
                      }
                      disabled={rejectMut.isPending}
                    >
                      <XCircle className="w-3 h-3 me-1" />
                      {t("general.reject")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6 text-indigo-400" />
            {lang === "ar" ? "محرك القرارات" : "Decision Engine"}
            {typedPending.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 ms-1">{typedPending.length}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "ar" ? "مراجعة القرارات التسويقية والموافقة عليها" : "Review and approve AI-generated marketing decisions"}
          </p>
        </div>
        <Button
          onClick={() => setShowGenPanel(!showGenPanel)}
          className="bg-indigo-500 hover:bg-indigo-600"
        >
          <Lightbulb className="w-4 h-4 me-2" />
          {lang === "ar" ? "توليد قرار" : "Generate Decision"}
        </Button>
      </div>

      {/* Generate Decision Panel */}
      {showGenPanel && (
        <Card className="bg-indigo-500/5 border-indigo-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-indigo-400">
              <Lightbulb className="w-4 h-4" />
              {lang === "ar" ? "توليد قرار جديد" : "Generate New Decision"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="w-full h-20 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-muted-foreground"
              placeholder={lang === "ar" ? "صف السياق أو المشكلة التي تحتاج قراراً..." : "Describe the context or problem that needs a decision..."}
              value={genContext}
              onChange={(e) => setGenContext(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => generateMut.mutate({ companyId, situation: genContext, decisionType: "strategy" })}
                disabled={generateMut.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {generateMut.isPending
                  ? <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  : <Zap className="w-4 h-4 me-2" />}
                {lang === "ar" ? "توليد" : "Generate"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowGenPanel(false)}>
                {t("general.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* Pending Queue */}
          {typedPending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {lang === "ar" ? "قرارات معلقة" : "Pending Decisions"} ({typedPending.length})
              </h2>
              <div className="space-y-3">
                {typedPending.map((d) => renderDecisionCard(d, true))}
              </div>
            </div>
          )}

          {/* All Decisions */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              {lang === "ar" ? "جميع القرارات" : "All Decisions"} ({typedDecisions.length})
            </h2>
            {typedDecisions.length === 0 ? (
              <div className="text-center py-12">
                <Scale className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">{t("general.noData")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {typedDecisions.map((d) => renderDecisionCard(d))}
              </div>
            )}
          </div>

          {/* Approved History Summary */}
          {approvedDecisions.length > 0 && (
            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {lang === "ar" ? "القرارات المعتمدة" : "Approved History"} ({approvedDecisions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {approvedDecisions.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 py-1 border-b border-border/20 last:border-0">
                      <CheckCircle className="w-3 h-3 text-green-400 shrink-0" />
                      <p className="text-xs text-muted-foreground flex-1 capitalize">{d.decisionType.replace(/_/g, " ")}</p>
                      {d.humanNotes && (
                        <p className="text-xs text-green-400/70 truncate max-w-48">{d.humanNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
