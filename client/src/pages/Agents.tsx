import { useI18n } from "@/contexts/i18nContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain } from "lucide-react";

const agentColorsByName: Record<string, string> = {
  "Chief Marketing Officer": "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  "Paid Media Director": "from-blue-500/20 to-blue-600/10 border-blue-500/30",
  "Performance Marketing Lead": "from-green-500/20 to-green-600/10 border-green-500/30",
  "Creative Director": "from-pink-500/20 to-pink-600/10 border-pink-500/30",
  "Copy Chief": "from-orange-500/20 to-orange-600/10 border-orange-500/30",
  "Content Strategist": "from-teal-500/20 to-teal-600/10 border-teal-500/30",
  "Funnel Architect": "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
  "CRM Expert": "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
  "SEO Strategist": "from-lime-500/20 to-lime-600/10 border-lime-500/30",
  "Data Analyst": "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
  "Competitor Analyst": "from-red-500/20 to-red-600/10 border-red-500/30",
  "Media Buyer": "from-violet-500/20 to-violet-600/10 border-violet-500/30",
  "QA Critic": "from-slate-500/20 to-slate-600/10 border-slate-500/30",
};

export default function Agents() {
  const { t } = useI18n();
  const { data: agents = [], isLoading } = trpc.agents.list.useQuery();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("agents.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("agents.teamDesc")} — {agents.length} {t("agents.agentsReady")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, idx) => (
            <Card
              key={agent.role ?? idx}
              className={`bg-gradient-to-br border ${agentColorsByName[agent.name] ?? "from-slate-500/10 to-slate-600/5 border-slate-500/20"} hover:scale-[1.01] transition-transform`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">{agent.icon}</span>
                  {agent.name}
                </CardTitle>
                {agent.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{agent.nameAr}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{agent.expertise}</p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.expertise.split(",").slice(0, 3).map((cap: string) => (
                    <Badge key={cap.trim()} className="text-[10px] bg-background/50 text-muted-foreground border-border">{cap.trim()}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{agent.role}</span>
                  <Badge className="text-[10px] bg-green-500/20 text-green-400">{t("agent.active")}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
