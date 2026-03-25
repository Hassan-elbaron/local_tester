import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  FileText, CheckCircle, Bot, Bell, TrendingUp, Clock,
  AlertCircle, Building2, ArrowRight, Brain, Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-400",
  deliberating: "bg-yellow-500/20 text-yellow-400",
  pending_approval: "bg-orange-500/20 text-orange-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  revised: "bg-blue-500/20 text-blue-400",
  executing: "bg-purple-500/20 text-purple-400",
  completed: "bg-emerald-500/20 text-emerald-400",
};

export default function Dashboard() {
  const { t } = useI18n();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id ?? 0;

  const { data: proposals = [] } = trpc.proposals.list.useQuery(
    { companyId }, { enabled: companyId > 0 }
  );
  const { data: pendingApprovals = [] } = trpc.approvals.pending.useQuery(
    { companyId }, { enabled: companyId > 0 }
  );
  const { data: auditLogs = [] } = trpc.audit.list.useQuery(
    { companyId, limit: 8 }, { enabled: companyId > 0 }
  );
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(
    { companyId }, { enabled: companyId > 0 }
  );

  const activeProposals = proposals.filter((p) =>
    ["under_deliberation", "pending_approval", "in_execution", "proposed"].includes(p.status ?? "")
  );

  if (!currentCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Company Selected</h2>
          <p className="text-muted-foreground text-sm mb-6">Create or select a company to get started</p>
          <Button asChild className="bg-indigo-500 hover:bg-indigo-600">
            <Link href="/companies">
              <Building2 className="w-4 h-4 mr-2" />
              Manage Companies
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard.overview")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {currentCompany.name} · {new Date().toLocaleDateString()}
          </p>
        </div>
        <Button asChild className="bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-500/20">
          <Link href="/proposals">
            <FileText className="w-4 h-4 mr-2" />
            {t("proposal.new")}
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold">{activeProposals.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.activeProposals")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-orange-400" />
              </div>
              {pendingApprovals.length > 0 && <AlertCircle className="w-4 h-4 text-orange-400" />}
            </div>
            <p className="text-2xl font-bold">{pendingApprovals.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.pendingApprovals")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">13</p>
            <p className="text-xs text-muted-foreground mt-1">{t("dashboard.totalAgents")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{unreadCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("notification.unread")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Proposals */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{t("dashboard.activeProposals")}</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
              <Link href="/proposals">
                {t("general.view")} <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>

          {proposals.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="p-8 text-center">
                <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No proposals yet. Create your first one!</p>
                <Button asChild size="sm" className="mt-4 bg-indigo-500 hover:bg-indigo-600">
                  <Link href="/proposals">{t("proposal.new")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {proposals.slice(0, 5).map((proposal) => (
                <Link key={proposal.id} href={`/proposals/${proposal.id}`}>
                  <Card className="bg-card border-border hover:border-indigo-500/30 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{proposal.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {proposal.type} · {proposal.budget ? `$${Number(proposal.budget).toLocaleString()}` : "No budget"}
                          </p>
                        </div>
                        <Badge className={`${statusColors[proposal.status] ?? "bg-slate-500/20 text-slate-400"} text-xs flex-shrink-0`}>
                          {t(`proposal.status.${proposal.status}`)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Pending Approvals Alert */}
          {pendingApprovals.length > 0 && (
            <Card className="bg-orange-500/10 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-300">
                        {pendingApprovals.length} {t("approval.pending")}
                      </p>
                      <p className="text-xs text-orange-400/70">Requires your attention</p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Link href="/approvals">
                      {t("general.view")} <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{t("dashboard.recentActivity")}</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
              <Link href="/audit">
                {t("general.view")} <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <Card className="bg-card border-border border-dashed">
                <CardContent className="p-6 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No activity yet</p>
                </CardContent>
              </Card>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{log.summary}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
