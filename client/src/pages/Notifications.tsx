import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Loader2, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-blue-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  success: <CheckCircle className="w-4 h-4 text-green-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  approval_request: <Bell className="w-4 h-4 text-orange-400" />,
  approval_decision: <CheckCheck className="w-4 h-4 text-indigo-400" />,
};

export default function Notifications() {
  const { t } = useI18n();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id ?? 0;
  const utils = trpc.useUtils();

  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery(
    { companyId }, { enabled: companyId > 0 }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success(t("notification.allMarkedRead"));
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const unread = notifications.filter((n) => !n.isRead);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("notification.title")}</h1>
          {unread.length > 0 && (
            <Badge className="mt-1 bg-indigo-500/20 text-indigo-400 text-xs">
              {unread.length} {t("notification.unread")}
            </Badge>
          )}
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate({ companyId })} disabled={markAllRead.isPending} className="text-xs">
            <CheckCheck className="w-3.5 h-3.5 me-1.5" />{t("notification.markAllReadLabel")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
      ) : notifications.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{t("notification.noNotificationsYet")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={cn("bg-card border-border transition-all cursor-pointer hover:border-indigo-500/30", !n.isRead && "border-indigo-500/30 bg-indigo-500/5")}
              onClick={() => !n.isRead && markRead.mutate({ id: n.id, companyId })}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    {typeIcons[n.type] ?? <Bell className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-medium", !n.isRead && "text-foreground")}>{n.title}</p>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
