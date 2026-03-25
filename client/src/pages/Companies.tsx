import { useState, useRef } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Plus, Loader2, CheckCircle, Upload, FileText, Image, BarChart2,
  Globe, Search, Shield, AlertTriangle, Clock, CheckSquare, XCircle, Play,
  Brain, ChevronRight, Trash2, Sparkles, Eye, EyeOff, ExternalLink, Wifi, WifiOff, ChevronDown, ChevronUp, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { SOCIAL_CATALOG, ANALYTICS_CATALOG } from "@/lib/catalogs";

type TabId = "overview" | "knowledge" | "research" | "memory" | "integrations";

const FILE_CATEGORIES = [
  { value: "logo", label: "Logo", icon: Image },
  { value: "brand_guidelines", label: "Brand Guidelines", icon: FileText },
  { value: "brief", label: "Company Brief", icon: FileText },
  { value: "audience_doc", label: "Audience Document", icon: FileText },
  { value: "competitor_analysis", label: "Competitor Analysis", icon: BarChart2 },
  { value: "report", label: "Report / Analytics", icon: BarChart2 },
  { value: "pricing", label: "Pricing Document", icon: FileText },
  { value: "creative", label: "Creative Asset", icon: Image },
  { value: "sales_doc", label: "Sales Document", icon: FileText },
  { value: "other", label: "Other", icon: FileText },
] as const;

const RESEARCH_TARGETS = [
  "Official website content",
  "Social media profiles",
  "News & press mentions",
  "Product/service catalog",
  "Team & leadership",
  "Customer reviews",
  "Job postings",
  "Competitor comparison",
];

const DATA_SOURCES = [
  "Company website",
  "LinkedIn",
  "Twitter/X",
  "Facebook",
  "Instagram",
  "Google News",
  "Crunchbase",
  "G2 / Capterra reviews",
];

export default function Companies() {
  const { t } = useI18n();
  const { currentCompany, setCurrentCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [extractingId, setExtractingId] = useState<number | null>(null);
  const [fileCategory, setFileCategory] = useState<string>("other");
  const [fileDescription, setFileDescription] = useState("");
  const [showResearchForm, setShowResearchForm] = useState(false);
  const [researchTargets, setResearchTargets] = useState<string[]>([]);
  const [researchSources, setResearchSources] = useState<string[]>([]);
  const [researchGoal, setResearchGoal] = useState("");
  const [researchFrequency, setResearchFrequency] = useState<"one_time" | "weekly" | "monthly">("one_time");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset } = useForm<{ name: string; nameAr: string; industry: string; website: string; description: string }>();
  const utils = trpc.useUtils();

  const activeId = selectedCompanyId ?? currentCompany?.id ?? null;

  const { data: companies = [], isLoading } = trpc.companies.list.useQuery();
  const { data: files = [], refetch: refetchFiles } = trpc.files.list.useQuery(
    { companyId: activeId! },
    { enabled: !!activeId && activeTab === "knowledge" }
  );
  const { data: researchRequests = [], refetch: refetchResearch } = trpc.research.list.useQuery(
    { companyId: activeId! },
    { enabled: !!activeId && activeTab === "research" }
  );
  const { data: memory = [] } = trpc.memory.get.useQuery(
    { companyId: activeId! },
    { enabled: !!activeId && activeTab === "memory" }
  );
  const { data: integrationList = [], refetch: refetchIntegrations } = trpc.settings.getIntegrations.useQuery(
    { companyId: activeId! },
    { enabled: !!activeId && activeTab === "integrations" }
  );
  const saveIntegration    = trpc.settings.saveIntegration.useMutation({ onSuccess: () => { toast.success("تم الحفظ"); refetchIntegrations(); }, onError: e => toast.error(e.message) });
  const deleteIntegration  = trpc.settings.deleteIntegration.useMutation({ onSuccess: () => { toast.success("تم الحذف"); refetchIntegrations(); }, onError: e => toast.error(e.message) });
  const toggleIntegration  = trpc.settings.markIntegrationConnected.useMutation({ onSuccess: (_, v) => { toast.success(v.connected ? "تم التوصيل ✓" : "تم القطع"); refetchIntegrations(); } });

  const createCompany = trpc.companies.create.useMutation({
    onSuccess: (company) => {
      toast.success(`Company "${company?.name ?? "New company"}" created!`);
      utils.companies.list.invalidate();
      setCurrentCompany(company as any);
      setOpen(false);
      reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadFile = trpc.files.upload.useMutation();

  const extractKnowledge = trpc.files.extract.useMutation({
    onSuccess: (data) => {
      toast.success(`Knowledge extracted! ${data.memoryCount} memory entries created.`);
      refetchFiles();
      setExtractingId(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setExtractingId(null);
    },
  });

  const requestResearch = trpc.research.request.useMutation({
    onSuccess: () => {
      toast.success("Research request created — awaiting your approval.");
      refetchResearch();
      setShowResearchForm(false);
      setResearchTargets([]);
      setResearchSources([]);
      setResearchGoal("");
    },
    onError: (err) => toast.error(err.message),
  });

  const approveResearch = trpc.research.approve.useMutation({
    onSuccess: () => {
      toast.success("Research approved. Click Execute to run it.");
      refetchResearch();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectResearch = trpc.research.reject.useMutation({
    onSuccess: () => {
      toast.success("Research request rejected.");
      refetchResearch();
      setRejectingId(null);
      setRejectReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const executeResearch = trpc.research.execute.useMutation({
    onSuccess: (data) => {
      toast.success(`Research complete! ${data.memoryCount} knowledge entries saved.`);
      refetchResearch();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadSingleFile = (file: File, companyId: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        uploadFile.mutate(
          {
            companyId,
            fileName: file.name,
            fileBase64: base64,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            category: fileCategory as any,
            description: fileDescription || undefined,
          },
          { onSuccess: () => resolve(), onError: (e) => reject(e) }
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !activeId) return;

    const MAX_SIZE = 200 * 1024 * 1024;
    const oversized = files.filter(f => f.size > MAX_SIZE);
    if (oversized.length) {
      toast.error(`${oversized.map(f => f.name).join(", ")} تجاوز الحد الأقصى 200MB`);
      return;
    }

    setUploadingFile(true);
    let successCount = 0;
    for (const file of files) {
      try {
        await uploadSingleFile(file, activeId);
        successCount++;
      } catch {
        toast.error(`فشل رفع ${file.name}`);
      }
    }
    if (successCount > 0) {
      toast.success(`تم رفع ${successCount} ملف بنجاح`);
      refetchFiles();
    }
    setUploadingFile(false);
    e.target.value = "";
  };

  const onSubmit = handleSubmit((data) => {
    createCompany.mutate({
      name: data.name,
      nameAr: data.nameAr || undefined,
      industry: data.industry || undefined,
      website: data.website || undefined,
      description: data.description || undefined,
    });
  });

  const activeCompany = companies.find(c => c.id === activeId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_approval": return "text-yellow-400 bg-yellow-500/10";
      case "approved": return "text-blue-400 bg-blue-500/10";
      case "running": return "text-purple-400 bg-purple-500/10";
      case "complete": return "text-green-400 bg-green-500/10";
      case "rejected": return "text-red-400 bg-red-500/10";
      case "failed": return "text-red-400 bg-red-500/10";
      default: return "text-muted-foreground bg-muted/20";
    }
  };

  const getExtractionColor = (status: string) => {
    switch (status) {
      case "complete": return "text-green-400";
      case "processing": return "text-yellow-400";
      case "failed": return "text-red-400";
      default: return "text-muted-foreground";
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "knowledge", label: "Knowledge Files", icon: Brain },
    { id: "research", label: "External Research", icon: Globe },
    { id: "memory", label: "Company Memory", icon: Sparkles },
    { id: "integrations", label: "Integrations", icon: Link2 },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Company List */}
      <div className="w-72 border-r border-border flex flex-col bg-card/30">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Companies</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600 h-7 px-2">
                <Plus className="w-3 h-3 mr-1" />New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
              <DialogHeader><DialogTitle>Create New Company</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  <div>
                    <Label>Company Name (English) *</Label>
                    <Input {...register("name", { required: true })} placeholder="TechFlow Solutions" className="mt-1" />
                  </div>
                  <div>
                    <Label>Company Name (Arabic)</Label>
                    <Input {...register("nameAr")} placeholder="تك فلو" className="mt-1" dir="rtl" />
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Input {...register("industry")} placeholder="Technology" className="mt-1" />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input {...register("website")} placeholder="https://example.com" className="mt-1" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea {...register("description")} placeholder="Brief company description..." className="mt-1" rows={4} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t border-border mt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createCompany.isPending} className="bg-indigo-500 hover:bg-indigo-600">
                    {createCompany.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            </div>
          ) : companies.map((company) => (
            <button
              key={company.id}
              onClick={() => { setSelectedCompanyId(company.id); setCurrentCompany(company as any); }}
              className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 ${
                activeId === company.id
                  ? "bg-indigo-500/15 border border-indigo-500/30"
                  : "hover:bg-muted/30 border border-transparent"
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: company.primaryColor ?? "#6366f1" }}
              >
                {company.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{company.name}</p>
                {company.industry && <p className="text-xs text-muted-foreground truncate">{company.industry}</p>}
              </div>
              {currentCompany?.id === company.id && (
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Company Detail */}
      {activeCompany ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: activeCompany.primaryColor ?? "#6366f1" }}
            >
              {activeCompany.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-lg">{activeCompany.name}</h1>
              <p className="text-xs text-muted-foreground">{activeCompany.industry} {activeCompany.website && `· ${activeCompany.website}`}</p>
            </div>
            <Badge className={`ml-auto text-xs ${activeCompany.knowledgeStatus === "complete" ? "bg-green-500/20 text-green-400" : activeCompany.knowledgeStatus === "partial" ? "bg-yellow-500/20 text-yellow-400" : "bg-muted/20 text-muted-foreground"}`}>
              Knowledge: {activeCompany.knowledgeStatus}
            </Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 pb-24">

            {/* ── Overview Tab ── */}
            {activeTab === "overview" && (
              <div className="space-y-4 max-w-2xl">
                <Card className="bg-card border-border">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Company Info</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Industry:</span> <span className="ml-2">{activeCompany.industry ?? "—"}</span></div>
                      <div><span className="text-muted-foreground">Website:</span> <span className="ml-2">{activeCompany.website ?? "—"}</span></div>
                      <div><span className="text-muted-foreground">Brand Voice:</span> <span className="ml-2">{activeCompany.brandVoice ?? "Not set"}</span></div>
                      <div><span className="text-muted-foreground">Knowledge:</span> <span className="ml-2 capitalize">{activeCompany.knowledgeStatus}</span></div>
                    </div>
                    {activeCompany.description && (
                      <p className="text-sm text-muted-foreground border-t border-border pt-3">{activeCompany.description}</p>
                    )}
                  </CardContent>
                </Card>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="bg-card border-border cursor-pointer hover:border-indigo-500/30" onClick={() => setActiveTab("knowledge")}>
                    <CardContent className="p-4 text-center">
                      <Brain className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                      <p className="text-sm font-medium">Upload Files</p>
                      <p className="text-xs text-muted-foreground">Brand, briefs, reports</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border cursor-pointer hover:border-indigo-500/30" onClick={() => setActiveTab("research")}>
                    <CardContent className="p-4 text-center">
                      <Globe className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                      <p className="text-sm font-medium">External Research</p>
                      <p className="text-xs text-muted-foreground">Web presence analysis</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border cursor-pointer hover:border-indigo-500/30" onClick={() => setActiveTab("memory")}>
                    <CardContent className="p-4 text-center">
                      <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                      <p className="text-sm font-medium">Company Memory</p>
                      <p className="text-xs text-muted-foreground">{memory.length} entries</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ── Knowledge Files Tab ── */}
            {activeTab === "knowledge" && (
              <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">Knowledge Files</h2>
                    <p className="text-sm text-muted-foreground">Upload brand files — the system extracts knowledge and injects it into agent deliberations.</p>
                  </div>
                </div>

                {/* Upload Area */}
                <Card className="bg-card border-border border-dashed">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">File Category</Label>
                          <Select value={fileCategory} onValueChange={setFileCategory}>
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FILE_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Description (optional)</Label>
                          <Input
                            value={fileDescription}
                            onChange={e => setFileDescription(e.target.value)}
                            placeholder="e.g. Q4 2025 Brand Guidelines"
                            className="mt-1 h-9"
                          />
                        </div>
                      </div>
                      <div
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500/40 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingFile ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                            <p className="text-sm text-muted-foreground">Uploading to S3...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                            <p className="text-sm font-medium">Click to upload files</p>
                            <p className="text-xs text-muted-foreground">PDF, DOCX, PNG, JPG, XLSX, SVG, MP4 — max 200MB each</p>
                            <p className="text-xs text-indigo-400">يمكنك اختيار أكثر من ملف في نفس الوقت</p>
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.txt,.pptx,.svg,.webp"
                        multiple
                        onChange={handleFileSelect}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Uploaded Files ({files.length})</h3>
                    {files.map(file => (
                      <Card key={file.id} className="bg-card border-border">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                              {file.mimeType.startsWith("image/") ? (
                                <Image className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-indigo-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.fileName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge className="text-xs bg-muted/20 text-muted-foreground">{file.category.replace("_", " ")}</Badge>
                                <span className={`text-xs flex items-center gap-1 ${getExtractionColor(file.extractionStatus)}`}>
                                  {file.extractionStatus === "complete" && <><CheckCircle className="w-3 h-3" />Knowledge extracted</>}
                                  {file.extractionStatus === "processing" && <><Loader2 className="w-3 h-3 animate-spin" />Extracting...</>}
                                  {file.extractionStatus === "pending" && <><Clock className="w-3 h-3" />Pending extraction</>}
                                  {file.extractionStatus === "failed" && <><XCircle className="w-3 h-3" />Extraction failed</>}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {file.extractionStatus === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={extractingId === file.id}
                                  onClick={() => {
                                    setExtractingId(file.id);
                                    extractKnowledge.mutate({ fileId: file.id, companyId: activeId! });
                                  }}
                                >
                                  {extractingId === file.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  ) : (
                                    <Brain className="w-3 h-3 mr-1" />
                                  )}
                                  Extract
                                </Button>
                              )}
                              {file.extractionStatus === "complete" && file.extractedKnowledge && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">
                                  <Eye className="w-3 h-3 mr-1" />View
                                </Button>
                              )}
                              <a href={file.fileUrl} target="_blank" rel="noreferrer">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground">
                                  <ChevronRight className="w-3 h-3" />
                                </Button>
                              </a>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {files.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No files uploaded yet.</p>
                    <p className="text-xs mt-1">Upload brand guidelines, briefs, or reports to build company knowledge.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── External Research Tab ── */}
            {activeTab === "research" && (
              <div className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">External Research</h2>
                    <p className="text-sm text-muted-foreground">
                      Research the company's public digital presence. Every research request requires your explicit approval before execution.
                    </p>
                  </div>
                  {!showResearchForm && (
                    <Button
                      size="sm"
                      className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
                      onClick={() => setShowResearchForm(true)}
                    >
                      <Search className="w-3.5 h-3.5 mr-1.5" />New Research Request
                    </Button>
                  )}
                </div>

                {/* Governance Notice */}
                <Card className="bg-yellow-500/5 border-yellow-500/20">
                  <CardContent className="p-3 flex items-start gap-3">
                    <Shield className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-yellow-400/80">
                      <strong className="text-yellow-400">Approval-First Policy:</strong> All external research requires your explicit approval before execution.
                      The system will show you exactly what it will search, where, and why — before doing anything.
                      Results are saved to company memory only after successful execution.
                    </div>
                  </CardContent>
                </Card>

                {/* New Research Form */}
                {showResearchForm && (
                  <Card className="bg-card border-indigo-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Search className="w-4 h-4 text-cyan-400" />
                        New Research Request — {activeCompany.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Research Goal *</Label>
                        <Textarea
                          value={researchGoal}
                          onChange={e => setResearchGoal(e.target.value)}
                          placeholder="e.g. Build a comprehensive brand profile including products, target audience, and competitive positioning"
                          className="mt-1 text-sm"
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">What to Research (select all that apply)</Label>
                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                          {RESEARCH_TARGETS.map(target => (
                            <button
                              key={target}
                              onClick={() => setResearchTargets(prev =>
                                prev.includes(target) ? prev.filter(t => t !== target) : [...prev, target]
                              )}
                              className={`text-xs px-2 py-1.5 rounded border text-left transition-colors ${
                                researchTargets.includes(target)
                                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                                  : "bg-muted/10 border-border text-muted-foreground hover:border-muted-foreground/40"
                              }`}
                            >
                              {target}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Data Sources</Label>
                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                          {DATA_SOURCES.map(source => (
                            <button
                              key={source}
                              onClick={() => setResearchSources(prev =>
                                prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
                              )}
                              className={`text-xs px-2 py-1.5 rounded border text-left transition-colors ${
                                researchSources.includes(source)
                                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-400"
                                  : "bg-muted/10 border-border text-muted-foreground hover:border-muted-foreground/40"
                              }`}
                            >
                              {source}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Research Frequency</Label>
                        <Select value={researchFrequency} onValueChange={(v) => setResearchFrequency(v as any)}>
                          <SelectTrigger className="mt-1 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_time">One-time only</SelectItem>
                            <SelectItem value="weekly">Weekly update</SelectItem>
                            <SelectItem value="monthly">Monthly update</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="bg-muted/10 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">Before you submit this request:</p>
                        <p>• This request will be created with status <strong className="text-yellow-400">Pending Approval</strong></p>
                        <p>• You must explicitly approve it before the system executes any search</p>
                        <p>• Results will be saved to <strong>{activeCompany.name}</strong>'s memory only</p>
                        <p>• Estimated data: Public web information only — no private data</p>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowResearchForm(false)}>Cancel</Button>
                        <Button
                          size="sm"
                          className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
                          disabled={!researchGoal || researchTargets.length === 0 || requestResearch.isPending}
                          onClick={() => {
                            if (!activeId) return;
                            requestResearch.mutate({
                              companyId: activeId,
                              searchTargets: researchTargets,
                              dataSources: researchSources.length ? researchSources : ["Company website"],
                              researchGoal,
                              frequency: researchFrequency,
                              estimatedDataSize: "< 1MB",
                              privacyNote: "Public web data only. No personal data collected.",
                            });
                          }}
                        >
                          {requestResearch.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Search className="w-3.5 h-3.5 mr-1.5" />}
                          Submit Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Research Requests List */}
                {researchRequests.length > 0 && (
                  <div className="space-y-3">
                    {researchRequests.map(req => (
                      <Card key={req.id} className="bg-card border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{req.researchGoal}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Requested by {req.requestedBy} · {new Date(req.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className={`text-xs flex-shrink-0 ${getStatusColor(req.status)}`}>
                              {req.status.replace("_", " ")}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                            <div>
                              <span className="font-medium text-foreground/70">Targets:</span>{" "}
                              {(req.searchTargets as string[]).slice(0, 3).join(", ")}
                              {(req.searchTargets as string[]).length > 3 && ` +${(req.searchTargets as string[]).length - 3} more`}
                            </div>
                            <div>
                              <span className="font-medium text-foreground/70">Frequency:</span>{" "}
                              {req.frequency.replace("_", " ")}
                            </div>
                          </div>

                          {req.privacyNote && (
                            <div className="flex items-center gap-1.5 text-xs text-green-400/70 mb-3">
                              <Shield className="w-3 h-3" />
                              {req.privacyNote}
                            </div>
                          )}

                          {/* Approval Gate Actions */}
                          {req.status === "pending_approval" && (
                            <div className="flex gap-2 pt-2 border-t border-border">
                              <div className="flex-1 text-xs text-yellow-400/80 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Awaiting your approval to proceed
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                                onClick={() => setRejectingId(req.id)}
                              >
                                <XCircle className="w-3 h-3 mr-1" />Reject
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                                disabled={approveResearch.isPending}
                                onClick={() => approveResearch.mutate({ requestId: req.id })}
                              >
                                <CheckSquare className="w-3 h-3 mr-1" />Approve
                              </Button>
                            </div>
                          )}

                          {req.status === "approved" && (
                            <div className="flex gap-2 pt-2 border-t border-border">
                              <div className="flex-1 text-xs text-blue-400/80 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Approved by {req.approvedBy} — ready to execute
                              </div>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30"
                                disabled={executeResearch.isPending}
                                onClick={() => executeResearch.mutate({ requestId: req.id })}
                              >
                                {executeResearch.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                ) : (
                                  <Play className="w-3 h-3 mr-1" />
                                )}
                                Execute Research
                              </Button>
                            </div>
                          )}

                          {req.status === "complete" && req.result && (
                            <div className="pt-2 border-t border-border">
                              <p className="text-xs text-green-400 flex items-center gap-1 mb-2">
                                <CheckCircle className="w-3 h-3" />
                                Research complete · {(req.memoryKeysCreated as number[])?.length ?? 0} memory entries saved
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {(req.result as any)?.summary}
                              </p>
                            </div>
                          )}

                          {req.status === "rejected" && (
                            <div className="pt-2 border-t border-border">
                              <p className="text-xs text-red-400 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Rejected by {req.rejectedBy}: {req.rejectionReason}
                              </p>
                            </div>
                          )}

                          {/* Reject Dialog */}
                          {rejectingId === req.id && (
                            <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg space-y-2">
                              <p className="text-xs font-medium text-red-400">Rejection Reason</p>
                              <Input
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Why are you rejecting this research request?"
                                className="h-8 text-xs"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRejectingId(null)}>Cancel</Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                                  disabled={!rejectReason || rejectResearch.isPending}
                                  onClick={() => rejectResearch.mutate({ requestId: req.id, reason: rejectReason })}
                                >
                                  Confirm Reject
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {researchRequests.length === 0 && !showResearchForm && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No research requests yet.</p>
                    <p className="text-xs mt-1">Create a research request to analyze {activeCompany.name}'s digital presence.</p>
                    <p className="text-xs mt-1 text-yellow-400/70">All requests require your approval before execution.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Memory Tab ── */}
            {activeTab === "memory" && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <h2 className="font-semibold">Company Memory</h2>
                  <p className="text-sm text-muted-foreground">All knowledge stored for {activeCompany.name}. Used by agents during deliberation.</p>
                </div>

                {memory.length > 0 ? (
                  <div className="space-y-2">
                    {["brand", "audience", "competitors", "strategy", "guidelines", "assets", "decisions", "performance"].map(category => {
                      const items = memory.filter((m: any) => m.category === category);
                      if (!items.length) return null;
                      return (
                        <div key={category}>
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                            {category} ({items.length})
                          </h3>
                          <div className="space-y-1.5 mb-4">
                            {items.map((item: any) => (
                              <Card key={item.id} className="bg-card border-border">
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-mono text-indigo-400">{item.key}</p>
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {typeof item.value === "object"
                                          ? Object.entries(item.value as Record<string, unknown>)
                                              .filter(([, v]) => v && typeof v !== "object")
                                              .map(([k, v]) => `${k}: ${v}`)
                                              .slice(0, 3)
                                              .join(" · ")
                                          : String(item.value)}
                                      </p>
                                    </div>
                                    <Badge className="text-xs bg-muted/20 text-muted-foreground flex-shrink-0">{item.source}</Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No memory entries yet.</p>
                    <p className="text-xs mt-1">Upload files or run external research to build company knowledge.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Integrations Tab ── */}
            {activeTab === "integrations" && (
              <div className="space-y-6 max-w-3xl">
                <IntegrationsPanel
                  companyId={activeId!}
                  integrationList={integrationList as any[]}
                  onSave={d => saveIntegration.mutate({ ...d, companyId: activeId! })}
                  onDelete={id => deleteIntegration.mutate({ id })}
                  onToggle={(id, connected) => toggleIntegration.mutate({ id, connected })}
                />
              </div>
            )}

          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Select a company to view details</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Integrations Panel (social + analytics per-company) ──────────────────────

function IntegrationItem({ catalog, saved, onSave, onDelete, onToggle }: {
  catalog: { type: string; label: string; color: string; icon: string; fields: { key: string; label: string }[]; link?: string; hint?: string };
  saved?: any; onSave: (d: any) => void; onDelete: (id: number) => void; onToggle: (id: number, c: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState(false);
  const isConnected = saved?.status === "connected";

  return (
    <Card className={`border transition-all ${isConnected ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card"}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-2xl">{catalog.icon}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{catalog.label}</span>
                {isConnected
                  ? <Badge className="text-xs px-1.5 py-0 bg-emerald-500/20 text-emerald-400 flex items-center gap-1"><Wifi className="w-2.5 h-2.5" />متصل</Badge>
                  : <Badge className="text-xs px-1.5 py-0 bg-muted text-muted-foreground flex items-center gap-1"><WifiOff className="w-2.5 h-2.5" />غير متصل</Badge>
                }
              </div>
              {catalog.hint && <p className="text-xs text-muted-foreground mt-0.5">{catalog.hint}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {saved && (
              <Button size="sm" variant="ghost" className={`h-7 px-2 text-xs ${isConnected ? "text-red-400" : "text-emerald-400"}`}
                onClick={() => onToggle(saved.id, !isConnected)}>
                {isConnected ? "قطع" : "توصيل"}
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setOpen(!open)}>
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="mt-4 border-t border-border pt-4 space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {catalog.fields.map(f => (
                <div key={f.key}>
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input type={showKeys ? "text" : "password"} value={fields[f.key] || ""}
                    onChange={e => setFields(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={saved ? "محفوظ — أدخل لتغييره" : `أدخل ${f.label}`}
                    className="mt-1 h-8 text-xs" />
                </div>
              ))}
            </div>
            <button className="text-xs text-muted-foreground flex items-center gap-1" onClick={() => setShowKeys(!showKeys)}>
              {showKeys ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showKeys ? "إخفاء" : "إظهار"} القيم
            </button>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600"
                onClick={() => { onSave({ id: saved?.id, type: catalog.type, name: catalog.label, credentials: fields }); setFields({}); }}>
                حفظ
              </Button>
              {catalog.link && (
                <a href={catalog.link} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <ExternalLink className="w-3 h-3 mr-1" />الحصول على بيانات
                  </Button>
                </a>
              )}
              {saved && <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => onDelete(saved.id)}><Trash2 className="w-3 h-3" /></Button>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntegrationsPanel({ companyId, integrationList, onSave, onDelete, onToggle }: {
  companyId: number; integrationList: any[];
  onSave: (d: any) => void; onDelete: (id: number) => void; onToggle: (id: number, c: boolean) => void;
}) {
  const getSaved = (type: string) => integrationList.find(i => i.type === type);

  return (
    <>
      <div>
        <h2 className="font-semibold mb-1">السوشيال ميديا</h2>
        <p className="text-sm text-muted-foreground">ربط حسابات الشركة — يستخدمها النظام للتعلم وتحليل الأداء</p>
      </div>
      <div className="space-y-3">
        {SOCIAL_CATALOG.map(cat => (
          <IntegrationItem key={cat.type} catalog={cat} saved={getSaved(cat.type)}
            onSave={onSave} onDelete={onDelete} onToggle={onToggle} />
        ))}
      </div>
      <div className="border-t border-border pt-6">
        <h2 className="font-semibold mb-1">التحليلات والموقع</h2>
        <p className="text-sm text-muted-foreground">ربط أدوات التتبع لفهم أداء الحملات وسلوك الزوار</p>
      </div>
      <div className="space-y-3">
        {ANALYTICS_CATALOG.map(cat => (
          <IntegrationItem key={cat.type} catalog={cat} saved={getSaved(cat.type)}
            onSave={onSave} onDelete={onDelete} onToggle={onToggle} />
        ))}
      </div>
    </>
  );
}
