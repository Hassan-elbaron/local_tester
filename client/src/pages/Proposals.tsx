import { useState } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { FileText, Plus, Loader2, Brain, ArrowRight, DollarSign, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

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

export default function Proposals() {
  const { t } = useI18n();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id ?? 0;
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, setValue, watch } = useForm<{
    title: string; type: string; budget: string; timeline: string; description: string;
  }>();
  const utils = trpc.useUtils();

  const { data: proposals = [], isLoading } = trpc.proposals.list.useQuery(
    { companyId }, { enabled: companyId > 0 }
  );

  const createProposal = trpc.proposals.create.useMutation({
    onSuccess: () => {
      toast.success("Proposal created successfully");
      utils.proposals.list.invalidate();
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = handleSubmit((data) => {
    createProposal.mutate({
      companyId,
      title: data.title,
      type: data.type as "strategy" | "campaign" | "budget" | "content" | "seo" | "paid_media" | "crm" | "funnel",
      budget: data.budget ? Number(data.budget) : undefined,
      timeline: data.timeline || undefined,
      description: data.description || undefined,
    });
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("nav.proposals")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{currentCompany?.name}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-500 hover:bg-indigo-600">
              <Plus className="w-4 h-4 mr-2" />{t("proposal.new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("proposal.new")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>{t("proposal.title")} *</Label>
                <Input {...register("title", { required: true })} placeholder="e.g. Q2 Growth Campaign" className="mt-1" />
              </div>
              <div>
                <Label>{t("proposal.type")} *</Label>
                <Select onValueChange={(v) => setValue("type", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {["campaign", "strategy", "content", "seo", "paid_ads", "social_media", "email", "brand", "product_launch", "other"].map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ").toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("proposal.budget")}</Label>
                  <Input {...register("budget")} type="number" placeholder="50000" className="mt-1" />
                </div>
                <div>
                  <Label>{t("proposal.timeline")}</Label>
                  <Input {...register("timeline")} placeholder="Q2 2024" className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea {...register("description")} placeholder="Brief description..." className="mt-1" rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("general.cancel")}</Button>
                <Button type="submit" disabled={createProposal.isPending} className="bg-indigo-500 hover:bg-indigo-600">
                  {createProposal.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t("general.create")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : proposals.length === 0 ? (
        <Card className="bg-card border-dashed border-border">
          <CardContent className="p-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No proposals yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Create your first marketing proposal to get started with multi-agent deliberation</p>
            <Button onClick={() => setOpen(true)} className="bg-indigo-500 hover:bg-indigo-600">
              <Plus className="w-4 h-4 mr-2" />{t("proposal.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {proposals.map((p) => (
            <Link key={p.id} href={`/proposals/${p.id}`}>
              <Card className="bg-card border-border hover:border-indigo-500/40 transition-all cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-indigo-400 transition-colors">{p.title}</h3>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{p.type}</span>
                          {p.budget && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />{Number(p.budget).toLocaleString()}
                            </span>
                          )}
                          {p.timeline && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{p.timeline}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge className={`${statusColors[p.status] ?? "bg-slate-500/20 text-slate-400"} text-xs`}>
                        {t(`proposal.status.${p.status}`)}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
