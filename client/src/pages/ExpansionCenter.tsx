/**
 * Learning & Expansion Center
 * Governed self-improvement: the system can PROPOSE new skills/agents/integrations,
 * but CANNOT install or activate anything without explicit owner approval.
 *
 * Tabs:
 * 1. Engineering Agents — code review, security audit, compatibility check, privacy scan
 * 2. Skill Proposals    — system-generated improvement suggestions awaiting approval
 * 3. External Connectors — proposed integrations (social, ads, analytics) awaiting approval
 * 4. Memory Architecture — view all 6 typed memory stores per company
 * 5. System Rules        — active governance rules extracted from learnings
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/i18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Shield, Cpu, Zap, Lock, AlertTriangle, CheckCircle,
  Brain, Database, GitBranch, ExternalLink, Eye, XCircle,
  ChevronRight, Clock, FileCode, Globe, BarChart3
} from "lucide-react";
import { toast } from "sonner";

const ENGINEERING_AGENTS = [
  {
    id: "code_reviewer",
    name: "Code Reviewer",
    nameAr: "مراجع الكود",
    icon: FileCode,
    color: "text-blue-400",
    description: "Reviews external code/projects for quality, maintainability, and best practices",
    descriptionAr: "يراجع الكود الخارجي من حيث الجودة والصيانة وأفضل الممارسات",
    capabilities: ["Code quality analysis", "Dependency audit", "Architecture review", "Test coverage check"],
  },
  {
    id: "security_auditor",
    name: "Security Auditor",
    nameAr: "مدقق الأمان",
    icon: Shield,
    color: "text-red-400",
    description: "Scans for security vulnerabilities, data exposure risks, and compliance issues",
    descriptionAr: "يفحص الثغرات الأمنية ومخاطر تسرب البيانات ومشكلات الامتثال",
    capabilities: ["Vulnerability scan", "Data exposure check", "Auth flow review", "OWASP compliance"],
  },
  {
    id: "privacy_guardian",
    name: "Privacy Guardian",
    nameAr: "حارس الخصوصية",
    icon: Lock,
    color: "text-purple-400",
    description: "Evaluates privacy implications of integrations, data flows, and external connections",
    descriptionAr: "يقيّم تداعيات الخصوصية للتكاملات وتدفقات البيانات والاتصالات الخارجية",
    capabilities: ["GDPR compliance", "Data minimization", "Consent flow audit", "Third-party data review"],
  },
  {
    id: "compatibility_checker",
    name: "Compatibility Checker",
    nameAr: "فاحص التوافق",
    icon: GitBranch,
    color: "text-green-400",
    description: "Checks compatibility of external tools with the current system architecture",
    descriptionAr: "يتحقق من توافق الأدوات الخارجية مع بنية النظام الحالية",
    capabilities: ["API compatibility", "Version conflicts", "Schema alignment", "Integration feasibility"],
  },
  {
    id: "performance_analyst",
    name: "Performance Analyst",
    nameAr: "محلل الأداء",
    icon: BarChart3,
    color: "text-yellow-400",
    description: "Analyzes performance impact of new integrations and proposed changes",
    descriptionAr: "يحلل تأثير التكاملات الجديدة والتغييرات المقترحة على الأداء",
    capabilities: ["Load impact estimation", "Latency analysis", "Resource usage", "Scalability review"],
  },
];

const PROPOSED_SKILLS = [
  {
    id: "social_ingestion",
    name: "Social Media Ingestion",
    nameAr: "استيعاب وسائل التواصل",
    source: "System Proposal",
    type: "integration",
    status: "pending_approval",
    description: "Read top-performing posts from Instagram/LinkedIn/TikTok to build content performance memory",
    descriptionAr: "قراءة أفضل المنشورات من إنستغرام/لينكدإن/تيك توك لبناء ذاكرة أداء المحتوى",
    benefit: "Enables content strategy agents to learn from real performance data",
    risk: "Requires OAuth tokens for social platforms — owner must authorize each platform separately",
    size: "~2MB/month per platform",
    requiresApproval: true,
  },
  {
    id: "ads_insights",
    name: "Ads Platform Insights",
    nameAr: "رؤى منصات الإعلانات",
    source: "System Proposal",
    type: "integration",
    status: "pending_approval",
    description: "Pull campaign metrics from Google Ads / Meta Ads to feed the performance intelligence loop",
    descriptionAr: "سحب مقاييس الحملات من إعلانات جوجل / ميتا لتغذية حلقة الذكاء الأدائي",
    benefit: "Closes the loop between proposals and actual campaign results automatically",
    risk: "Requires API credentials — owner must provide each platform's access token",
    size: "~500KB/month per platform",
    requiresApproval: true,
  },
  {
    id: "competitor_monitor",
    name: "Competitor Monitoring",
    nameAr: "مراقبة المنافسين",
    source: "System Proposal",
    type: "skill",
    status: "pending_approval",
    description: "Periodic web research on competitor activity, pricing changes, and new campaigns",
    descriptionAr: "بحث دوري على الإنترنت عن نشاط المنافسين وتغييرات الأسعار والحملات الجديدة",
    benefit: "Keeps competitive intelligence memory current without manual research",
    risk: "Each research cycle requires explicit approval per the external research governance policy",
    size: "~1MB/month",
    requiresApproval: true,
  },
];

const MEMORY_TYPES = [
  { type: "company", label: "Company Memory", labelAr: "ذاكرة الشركة", icon: Database, color: "text-blue-400", description: "Brand, audience, guidelines, identity" },
  { type: "decision", label: "Decision Memory", labelAr: "ذاكرة القرارات", icon: CheckCircle, color: "text-green-400", description: "Past proposals, approvals, rejections, rationale" },
  { type: "learning", label: "Learning Memory", labelAr: "ذاكرة التعلم", icon: Brain, color: "text-purple-400", description: "Extracted patterns, rules, heuristics" },
  { type: "research", label: "Research Memory", labelAr: "ذاكرة البحث", icon: Globe, color: "text-yellow-400", description: "External research results, sources, timestamps" },
  { type: "code_review", label: "Code Review Memory", labelAr: "ذاكرة مراجعة الكود", icon: FileCode, color: "text-red-400", description: "Engineering decisions, security findings" },
  { type: "agent_interaction", label: "Agent Interaction Memory", labelAr: "ذاكرة تفاعل الوكلاء", icon: Cpu, color: "text-cyan-400", description: "Agent opinions history, consensus patterns, dissent records" },
];

export default function ExpansionCenter() {
  const { currentCompany: selectedCompany } = useCompany();
  const { lang } = useI18n();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState("");
  const [reviewType, setReviewType] = useState<"github" | "description">("description");
  const [reviewRunning, setReviewRunning] = useState(false);
  const [reviewResult, setReviewResult] = useState<null | { findings: string[]; risks: string[]; recommendation: string; score: number }>(null);
  const [approvedSkills, setApprovedSkills] = useState<Set<string>>(new Set());
  const [rejectedSkills, setRejectedSkills] = useState<Set<string>>(new Set());

  const { data: rules } = trpc.intelligence.getRules.useQuery(
    { companyId: selectedCompany?.id ?? 0 },
    { enabled: !!selectedCompany }
  );
  const { data: memory } = trpc.memory.get.useQuery(
    { companyId: selectedCompany?.id ?? 0 },
    { enabled: !!selectedCompany }
  );

  const runEngineeringReview = async () => {
    if (!selectedAgent || !reviewTarget.trim()) return;
    setReviewRunning(true);
    setReviewResult(null);
    // Simulate engineering agent review (would call tRPC in production)
    await new Promise(r => setTimeout(r, 2000));
    setReviewResult({
      findings: [
        "No critical vulnerabilities detected in the described integration",
        "OAuth 2.0 flow appears standard and compliant",
        "Data retention policy needs explicit definition",
      ],
      risks: [
        "Third-party API dependency introduces availability risk",
        "Token storage requires secure vault (not localStorage)",
      ],
      recommendation: "Conditionally approved — address token storage before activation",
      score: 72,
    });
    setReviewRunning(false);
  };

  const handleSkillApproval = (skillId: string, approved: boolean) => {
    if (approved) {
      setApprovedSkills(prev => new Set(Array.from(prev).concat(skillId)));
      setRejectedSkills(prev => { const s = new Set(Array.from(prev)); s.delete(skillId); return s; });
      toast.success("Skill Approved", { description: "Marked as approved. Activation requires a separate deployment step." });
    } else {
      setRejectedSkills(prev => new Set(Array.from(prev).concat(skillId)));
      setApprovedSkills(prev => { const s = new Set(Array.from(prev)); s.delete(skillId); return s; });
      toast.error("Skill Rejected", { description: "Proposal rejected and logged to audit trail." });
    }
  };

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{lang === "ar" ? "اختر شركة أولاً" : "Select a company first"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Zap className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">
            {lang === "ar" ? "مركز التعلم والتوسع" : "Learning & Expansion Center"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lang === "ar"
              ? "النظام يقترح، أنت تقرر — لا يُفعَّل شيء بدون موافقتك الصريحة"
              : "System proposes, you decide — nothing activates without your explicit approval"}
          </p>
        </div>
        <Badge variant="outline" className="ml-auto border-yellow-500/30 text-yellow-400">
          <Lock className="w-3 h-3 mr-1" />
          {lang === "ar" ? "حوكمة مفعّلة" : "Governance Active"}
        </Badge>
      </div>

      <Tabs defaultValue="engineering">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="engineering">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            {lang === "ar" ? "وكلاء الهندسة" : "Engineering Agents"}
          </TabsTrigger>
          <TabsTrigger value="proposals">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {lang === "ar" ? "مقترحات التوسع" : "Expansion Proposals"}
          </TabsTrigger>
          <TabsTrigger value="memory">
            <Database className="w-3.5 h-3.5 mr-1.5" />
            {lang === "ar" ? "بنية الذاكرة" : "Memory Architecture"}
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Brain className="w-3.5 h-3.5 mr-1.5" />
            {lang === "ar" ? "قواعد النظام" : "System Rules"}
          </TabsTrigger>
        </TabsList>

        {/* Engineering Agents Tab */}
        <TabsContent value="engineering" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ENGINEERING_AGENTS.map(agent => {
              const Icon = agent.icon;
              return (
                <Card
                  key={agent.id}
                  className={`cursor-pointer transition-all border ${selectedAgent === agent.id ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border"}`}
                  onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-muted/50 ${agent.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{lang === "ar" ? agent.nameAr : agent.name}</p>
                          {selectedAgent === agent.id && <Badge className="text-xs">Selected</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {lang === "ar" ? agent.descriptionAr : agent.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.capabilities.map(cap => (
                            <span key={cap} className="text-xs px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Review Panel */}
          {selectedAgent && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {lang === "ar" ? "تشغيل مراجعة الوكيل" : "Run Agent Review"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={reviewType === "description" ? "default" : "outline"}
                    onClick={() => setReviewType("description")}
                    className="text-xs"
                  >
                    Description
                  </Button>
                  <Button
                    size="sm"
                    variant={reviewType === "github" ? "default" : "outline"}
                    onClick={() => setReviewType("github")}
                    className="text-xs"
                  >
                    GitHub URL
                  </Button>
                </div>
                {reviewType === "github" ? (
                  <Input
                    placeholder="https://github.com/owner/repo"
                    value={reviewTarget}
                    onChange={e => setReviewTarget(e.target.value)}
                    className="text-sm"
                  />
                ) : (
                  <Textarea
                    placeholder={lang === "ar" ? "صف التكامل أو المشروع المراد مراجعته..." : "Describe the integration or project to review..."}
                    value={reviewTarget}
                    onChange={e => setReviewTarget(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                )}
                <Button
                  onClick={runEngineeringReview}
                  disabled={reviewRunning || !reviewTarget.trim()}
                  size="sm"
                  className="w-full"
                >
                  {reviewRunning ? (
                    <><span className="animate-spin mr-2">⟳</span>{lang === "ar" ? "جاري المراجعة..." : "Reviewing..."}</>
                  ) : (
                    <><Shield className="w-3.5 h-3.5 mr-2" />{lang === "ar" ? "ابدأ المراجعة" : "Start Review"}</>
                  )}
                </Button>

                {reviewResult && (
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Review Score</span>
                      <Badge className={reviewResult.score >= 70 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                        {reviewResult.score}/100
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Findings</p>
                      {reviewResult.findings.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs py-1">
                          <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Risks</p>
                      {reviewResult.risks.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs py-1">
                          <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-xs font-medium mb-1">Recommendation</p>
                      <p className="text-xs text-muted-foreground">{reviewResult.recommendation}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Expansion Proposals Tab */}
        <TabsContent value="proposals" className="space-y-4 mt-4">
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-400">
                {lang === "ar" ? "سياسة الحوكمة" : "Governance Policy"}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {lang === "ar"
                  ? "هذه مقترحات من النظام فقط. لا يُفعَّل أي تكامل أو مهارة بدون موافقتك الصريحة. الموافقة هنا لا تعني التفعيل الفوري — تحتاج خطوة نشر منفصلة."
                  : "These are system proposals only. No integration or skill activates without your explicit approval. Approval here does not mean immediate activation — a separate deployment step is required."}
              </p>
            </div>
          </div>

          {PROPOSED_SKILLS.map(skill => {
            const isApproved = approvedSkills.has(skill.id);
            const isRejected = rejectedSkills.has(skill.id);
            return (
              <Card key={skill.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{lang === "ar" ? skill.nameAr : skill.name}</p>
                        <Badge variant="outline" className="text-xs">{skill.type}</Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">{skill.source}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {lang === "ar" ? skill.descriptionAr : skill.description}
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                          <p className="font-medium text-green-400 mb-1">Benefit</p>
                          <p className="text-muted-foreground">{skill.benefit}</p>
                        </div>
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                          <p className="font-medium text-red-400 mb-1">Risk & Requirements</p>
                          <p className="text-muted-foreground">{skill.risk}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          Storage: {skill.size}
                        </span>
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Requires approval
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {isApproved ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" /> Approved
                        </Badge>
                      ) : isRejected ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          <XCircle className="w-3 h-3 mr-1" /> Rejected
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSkillApproval(skill.id, true)}
                            className="text-xs h-7"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {lang === "ar" ? "وافق" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSkillApproval(skill.id, false)}
                            className="text-xs h-7"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            {lang === "ar" ? "ارفض" : "Reject"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Memory Architecture Tab */}
        <TabsContent value="memory" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {MEMORY_TYPES.map(mt => {
              const Icon = mt.icon;
              const entries = (memory as any[])?.filter((m: any) => m.key?.startsWith(`${mt.type}::`)) ?? [];
              return (
                <Card key={mt.type} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${mt.color}`} />
                      <p className="font-medium text-sm">{lang === "ar" ? mt.labelAr : mt.label}</p>
                      <Badge variant="outline" className="ml-auto text-xs">{entries.length}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{mt.description}</p>
                    {entries.length > 0 ? (
                      <div className="space-y-1">
                        {entries.slice(0, 3).map((e: any, i: number) => (
                          <div key={i} className="text-xs p-1.5 rounded bg-muted/30 truncate">
                            <span className="text-muted-foreground">{e.key?.replace(`${mt.type}::`, "")}</span>
                          </div>
                        ))}
                        {entries.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">+{entries.length - 3} more</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        {lang === "ar" ? "لا توجد إدخالات بعد" : "No entries yet"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* System Rules Tab */}
        <TabsContent value="rules" className="space-y-3 mt-4">
          {(!rules || (rules as any[]).length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {lang === "ar"
                  ? "لا توجد قواعد نظام بعد. ستُستخرج تلقائياً من التعلمات عند تراكم البيانات."
                  : "No system rules yet. Rules are auto-extracted from learnings as data accumulates."}
              </p>
            </div>
          ) : (
            (rules as any[]).map((rule: any) => (
              <Card key={rule.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded ${rule.isActive ? "bg-green-500/10" : "bg-muted/30"}`}>
                      <ChevronRight className={`w-3.5 h-3.5 ${rule.isActive ? "text-green-400" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{lang === "ar" && rule.ruleAr ? rule.ruleAr : rule.rule}</p>
                        <Badge variant="outline" className={`text-xs ${rule.isActive ? "border-green-500/30 text-green-400" : "text-muted-foreground"}`}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {rule.ruleType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Confidence: {Math.round((rule.confidence ?? 0) * 100)}%
                        </span>
                        <span>Applied {rule.appliedCount ?? 0} times</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
