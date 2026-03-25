import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { CheckCircle, XCircle, Clock, Loader2, ArrowRight, Brain } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function Approvals() {
  const { t } = useI18n();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id ?? 0;
  const utils = trpc.useUtils();
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: approvals = [], isLoading } = trpc.approvals.list.useQuery(
    { companyId }, { enabled: companyId > 0 }
  );

  const approve = trpc.approvals.approve.useMutation({
    onSuccess: () => { toast.success("Approved! ✓"); utils.approvals.list.invalidate(); utils.approvals.pending.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const reject = trpc.approvals.reject.useMutation({
    onSuccess: () => { toast.success("Rejected."); utils.approvals.list.invalidate(); utils.approvals.pending.invalidate(); setRejectId(null); setRejectReason(""); },
    onError: (err) => toast.error(err.message),
  });

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("nav.approvals")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{currentCompany?.name}</p>
      </div>

      {/* Pending */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-400" />
          Pending Approval ({pending.length})
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-24"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
        ) : pending.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-400/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No pending approvals — all clear!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pending.map((p) => (
              <Card key={p.id} className="bg-card border-orange-500/20 hover:border-orange-500/40 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Brain className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.proposalTitle ?? `Proposal #${p.proposalId}`}</p>
                        <p className="text-xs text-muted-foreground">{p.proposalType ?? "—"} · {new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => approve.mutate({ approvalId: p.id, companyId })} disabled={approve.isPending} className="bg-green-600 hover:bg-green-700 h-8 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />{t("approval.approve")}
                      </Button>
                      <Button size="sm" onClick={() => setRejectId(rejectId === p.id ? null : p.id)} disabled={reject.isPending} variant="destructive" className="h-8 text-xs">
                        <XCircle className="w-3.5 h-3.5 mr-1" />{t("approval.reject")}
                      </Button>
                      <Link href={`/proposals/${p.proposalId}`}>
                        <Button size="sm" variant="ghost" className="h-8 text-xs"><ArrowRight className="w-3.5 h-3.5" /></Button>
                      </Link>
                    </div>
                  </div>
                  {rejectId === p.id && (
                    <div className="space-y-2 pt-2">
                      <textarea className="w-full bg-background border border-border rounded-lg p-2 text-sm resize-none" rows={2} placeholder="Reason for rejection (required)..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <Button size="sm" variant="destructive" disabled={!rejectReason.trim() || reject.isPending} onClick={() => reject.mutate({ approvalId: p.id, companyId, reason: rejectReason })} className="h-7 text-xs">
                        {reject.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Confirm Rejection
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Decided */}
      {decided.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">History ({decided.length})</h2>
          <div className="grid gap-2">
            {decided.map((p) => (
              <Link key={p.id} href={`/proposals/${p.proposalId}`}>
                <Card className="bg-card border-border hover:border-indigo-500/30 transition-all cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <p className="font-medium text-sm truncate">{p.proposalTitle ?? `Proposal #${p.proposalId}`}</p>
                        <span className="text-xs text-muted-foreground">{p.proposalType ?? "—"}</span>
                      </div>
                      <Badge className={`text-xs ${p.status === "approved" ? "bg-green-500/20 text-green-400" : p.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {p.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
