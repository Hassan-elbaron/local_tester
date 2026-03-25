import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const actionColors: Record<string, string> = {
  created: "bg-green-500/20 text-green-400",
  updated: "bg-blue-500/20 text-blue-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-red-500/20 text-red-400",
  deliberated: "bg-indigo-500/20 text-indigo-400",
  revision_requested: "bg-orange-500/20 text-orange-400",
  executed: "bg-purple-500/20 text-purple-400",
};

export default function AuditLog() {
  const { t } = useI18n();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id ?? 0;

  const { data: logs = [], isLoading } = trpc.audit.list.useQuery(
    { companyId }, { enabled: companyId > 0 }
  );

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("nav.audit")}</h1>
        <p className="text-muted-foreground text-sm mt-1">Full traceability of all decisions and actions</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
      ) : logs.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No audit logs yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-3 pl-10">
            {logs.map((log) => (
              <div key={log.id} className="relative">
                <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-indigo-500/50 border-2 border-background" />
                <Card className="bg-card border-border hover:border-indigo-500/20 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0", log.entityType === "agent" ? "bg-indigo-500/20" : "bg-slate-500/20")}>
                          {log.entityType === "agent" ? <Bot className="w-3.5 h-3.5 text-indigo-400" /> : <User className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{log.summary}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.actor} · {log.entityType}
                            {log.entityId && <span className="opacity-60"> #{log.entityId}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`text-[10px] ${actionColors[log.action] ?? "bg-slate-500/20 text-slate-400"}`}>{log.action}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
