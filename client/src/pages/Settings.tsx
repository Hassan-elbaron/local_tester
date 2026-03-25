import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Brain, CheckCircle2, XCircle, Loader2, Trash2,
  Eye, EyeOff, ExternalLink, Settings2, Star,
  ChevronDown, ChevronUp, Zap, Download, Terminal,
  RefreshCw, AlertCircle, CheckCheck, Monitor,
} from "lucide-react";

// ─── LLM Catalog ─────────────────────────────────────────────────────────────

const LLM_CATALOG = [
  // Cloud Free
  { provider: "google",      label: "Gemini 2.5 Flash",               modelId: "gemini-2.5-flash",                       apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai", category: "cloud_free" as const, desc: "أسرع نموذج Gemini — مجاني ومتاح",                        keyLink: "https://aistudio.google.com/app/apikey",  keyHint: "Google AI Studio", color: "#4285F4" },
  { provider: "google",      label: "Gemini 2.0 Flash",               modelId: "gemini-2.0-flash",                       apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai", category: "cloud_free" as const, desc: "الجيل السابق — سريع ومجاني",                             keyLink: "https://aistudio.google.com/app/apikey",  keyHint: "Google AI Studio", color: "#4285F4" },
  { provider: "groq",        label: "Llama 3.3 70B (Groq)",           modelId: "llama-3.3-70b-versatile",                apiUrl: "https://api.groq.com/openai/v1",                          category: "cloud_free" as const, desc: "استنتاج فائق السرعة — Tier مجاني سخي",                   keyLink: "https://console.groq.com/keys",           keyHint: "Groq Console",     color: "#F55036" },
  { provider: "groq",        label: "Mixtral 8x7B (Groq)",            modelId: "mixtral-8x7b-32768",                     apiUrl: "https://api.groq.com/openai/v1",                          category: "cloud_free" as const, desc: "نموذج مزيج خبراء — ممتاز للعربية",                       keyLink: "https://console.groq.com/keys",           keyHint: "Groq Console",     color: "#F55036" },
  { provider: "openrouter",  label: "OpenRouter (100+ نموذج)",        modelId: "meta-llama/llama-3.1-8b-instruct:free",  apiUrl: "https://openrouter.ai/api/v1",                           category: "cloud_free" as const, desc: "وصول لكل النماذج بـ API واحد — منها مجاني",              keyLink: "https://openrouter.ai/keys",              keyHint: "OpenRouter",       color: "#8B5CF6" },
  // Cloud Paid
  { provider: "openai",      label: "GPT-4o",                         modelId: "gpt-4o",                                 apiUrl: "https://api.openai.com/v1",                              category: "cloud_paid" as const, desc: "أقوى نموذج OpenAI — متعدد الوسائط",                      keyLink: "https://platform.openai.com/api-keys",    keyHint: "OpenAI Platform",  color: "#10A37F" },
  { provider: "openai",      label: "GPT-4o Mini",                    modelId: "gpt-4o-mini",                            apiUrl: "https://api.openai.com/v1",                              category: "cloud_paid" as const, desc: "سريع واقتصادي من OpenAI",                                keyLink: "https://platform.openai.com/api-keys",    keyHint: "OpenAI Platform",  color: "#10A37F" },
  { provider: "google",      label: "Gemini 2.5 Pro",                 modelId: "gemini-2.5-pro-preview-05-06",           apiUrl: "https://generativelanguage.googleapis.com/v1beta/openai", category: "cloud_paid" as const, desc: "الأقوى من Google — للمهام المعقدة",                     keyLink: "https://aistudio.google.com/app/apikey",  keyHint: "Google AI Studio", color: "#4285F4" },
  { provider: "mistral",     label: "Mistral Large",                  modelId: "mistral-large-latest",                   apiUrl: "https://api.mistral.ai/v1",                              category: "cloud_paid" as const, desc: "أوروبي، قوي متعدد اللغات",                               keyLink: "https://console.mistral.ai",              keyHint: "Mistral Console",  color: "#FF7000" },
  { provider: "anthropic_or",label: "Claude 3.5 Sonnet (OpenRouter)", modelId: "anthropic/claude-3.5-sonnet",            apiUrl: "https://openrouter.ai/api/v1",                           category: "cloud_paid" as const, desc: "أفضل نموذج للتفكير والمستندات — عبر OpenRouter",          keyLink: "https://openrouter.ai/keys",              keyHint: "OpenRouter",       color: "#C5743F" },
  // Local / Offline
  { provider: "ollama",    label: "Ollama (محلي أوفلاين)",  modelId: "llama3.2",  apiUrl: "http://localhost:11434/v1", category: "local" as const, desc: "تشغيل AI محلياً بدون إنترنت — مجاني تماماً", color: "#555555", isOffline: true, setupNote: "سيتم التثبيت تلقائياً" },
  { provider: "lmstudio",  label: "LM Studio (محلي)",       modelId: "local-model", apiUrl: "http://localhost:1234/v1",  category: "local" as const, desc: "واجهة مستخدم سهلة لتشغيل النماذج محلياً",   color: "#2563EB", isOffline: true, setupNote: "يحتاج تثبيت يدوي", lmStudio: true },
];

// ─── Ollama Setup Wizard ──────────────────────────────────────────────────────

function OllamaWizard({ modelId, onConfigured }: { modelId: string; onConfigured: () => void }) {
  const [checking, setChecking] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const { data: status, refetch } = trpc.settings.checkOllama.useQuery({ modelId }, { refetchInterval: pulling ? 5000 : false });
  const pullModel = trpc.settings.pullOllamaModel.useMutation();

  const handleCheck = async () => {
    setChecking(true);
    await refetch();
    setChecking(false);
  };

  const handlePull = async () => {
    setPulling(true);
    const r = await pullModel.mutateAsync({ modelId });
    if (r.started) {
      toast.info(`⬇ ${r.reason}`);
    } else {
      toast.error(r.reason);
      setPulling(false);
    }
  };

  const handleModelReady = () => {
    setPulling(false);
    toast.success("✓ النموذج جاهز!");
    onConfigured();
  };

  if (status?.modelReady && pulling) {
    handleModelReady();
  }

  const steps = [
    {
      num: 1, label: "تثبيت Ollama",
      status: status?.running ? "done" : "pending",
      content: status?.running ? null : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Ollama غير مثبّت أو غير مشغّل على جهازك</p>
          <div className="space-y-1.5">
            <a href="https://ollama.ai/download" target="_blank" rel="noreferrer">
              <Button size="sm" className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600 w-full">
                <Download className="w-3 h-3 mr-1" />تحميل Ollama من ollama.ai
              </Button>
            </a>
            <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 font-mono">
              <p className="text-amber-400 mb-1"># بعد التثبيت، شغّل:</p>
              <p>ollama serve</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={handleCheck} disabled={checking}>
              {checking ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              تحقق من التثبيت
            </Button>
          </div>
        </div>
      ),
    },
    {
      num: 2, label: `تحميل النموذج: ${modelId}`,
      status: !status?.running ? "locked" : status?.modelReady ? "done" : "pending",
      content: status?.running && !status?.modelReady ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Ollama مشغّل لكن النموذج <span className="font-mono text-amber-400">{modelId}</span> غير محمّل</p>
          {status?.models?.length > 0 && (
            <div className="text-xs text-muted-foreground">
              النماذج المتاحة: {status.models.join(", ")}
            </div>
          )}
          <div className="text-xs bg-muted/30 rounded p-2 font-mono">
            <p className="text-amber-400 mb-1"># أو شغّل يدوياً:</p>
            <p>ollama pull {modelId}</p>
          </div>
          <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 w-full" onClick={handlePull} disabled={pulling}>
            {pulling ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />جاري التحميل... (قد يأخذ دقائق)</> : <><Download className="w-3 h-3 mr-1" />تحميل تلقائي</>}
          </Button>
          {pulling && (
            <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={handleCheck}>
              <RefreshCw className="w-3 h-3 mr-1" />تحديث الحالة
            </Button>
          )}
        </div>
      ) : null,
    },
    {
      num: 3, label: "النموذج جاهز للاستخدام",
      status: status?.modelReady ? "done" : "locked",
      content: status?.modelReady ? (
        <Button size="sm" className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600" onClick={onConfigured}>
          تفعيل كنموذج افتراضي
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-3 mt-3">
      <div className="text-xs text-indigo-400 bg-indigo-500/10 rounded p-2 flex items-start gap-2">
        <Monitor className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>Ollama يعمل <strong>محلياً</strong> على جهازك — لا يحتاج إنترنت ولا API Key، وبياناتك تبقى خاصة</span>
      </div>
      <div className="space-y-2">
        {steps.map(step => (
          <div key={step.num} className={`rounded-lg border p-3 ${step.status === "locked" ? "opacity-40 border-border" : step.status === "done" ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
            <div className="flex items-center gap-2 mb-2">
              {step.status === "done" ? <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" /> : step.status === "locked" ? <div className="w-4 h-4 rounded-full border border-muted-foreground/40 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-amber-400 shrink-0" />}
              <span className={`text-xs font-medium ${step.status === "done" ? "text-emerald-400" : step.status === "locked" ? "text-muted-foreground" : "text-amber-400"}`}>
                الخطوة {step.num}: {step.label}
              </span>
            </div>
            {step.content}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LM Studio Info ───────────────────────────────────────────────────────────

function LMStudioInfo() {
  return (
    <div className="space-y-3 mt-3">
      <div className="text-xs text-amber-400 bg-amber-500/10 rounded p-2 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>LM Studio يحتاج <strong>تثبيت يدوي</strong> — لكنه سهل جداً</span>
      </div>
      <div className="space-y-2 text-xs">
        {[
          { num: 1, text: "حمّل LM Studio من lmstudio.ai", link: "https://lmstudio.ai", btn: "تحميل LM Studio" },
          { num: 2, text: "افتح التطبيق واختر أي نموذج (مثل Llama 3 أو Phi-3)" },
          { num: 3, text: "اضغط \"Local Server\" في القائمة اليسرى ثم ابدأ السيرفر" },
          { num: 4, text: "ارجع هنا، احفظ الإعدادات، واختبر الاتصال" },
        ].map(step => (
          <div key={step.num} className="flex items-start gap-2 bg-muted/20 rounded p-2">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center shrink-0 font-bold">{step.num}</span>
            <div className="flex-1">
              <p className="text-muted-foreground">{step.text}</p>
              {step.link && (
                <a href={step.link} target="_blank" rel="noreferrer">
                  <Button size="sm" className="h-6 text-xs mt-1.5 bg-blue-600 hover:bg-blue-700">
                    <Download className="w-3 h-3 mr-1" />{step.btn}
                  </Button>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs bg-muted/30 rounded p-2 font-mono">
        <p className="text-muted-foreground mb-1">اضبط هذه القيم بعد التثبيت:</p>
        <p>API URL: http://localhost:1234/v1</p>
        <p>Model ID: اسم النموذج الذي حمّلته</p>
      </div>
    </div>
  );
}

// ─── LLM Card ─────────────────────────────────────────────────────────────────

function LlmCard({ cat, saved, onSave, onTest, onDelete, onSetDefault }: {
  cat: typeof LLM_CATALOG[0];
  saved?: any;
  onSave: (d: any) => void;
  onTest: (id: number, key: string, url: string, model: string) => Promise<boolean>;
  onDelete: (id: number) => void;
  onSetDefault: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState((cat as any).apiUrl || "");
  const [modelId, setModelId] = useState(cat.modelId);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const isDefault = saved?.isDefault;
  const testStatus = saved?.testStatus;
  const catLabel = { cloud_free: "مجاني", cloud_paid: "مدفوع", local: "أوفلاين" }[cat.category];
  const catColor = { cloud_free: "bg-emerald-500/20 text-emerald-400", cloud_paid: "bg-amber-500/20 text-amber-400", local: "bg-blue-500/20 text-blue-400" }[cat.category];

  const handleSave = () => {
    onSave({ id: saved?.id, provider: cat.provider, modelId, label: cat.label, apiKey: apiKey || undefined, apiUrl, category: cat.category });
    setApiKey("");
  };

  const handleTest = async () => {
    if (!saved?.id) { toast.error("احفظ أولاً"); return; }
    setTesting(true);
    await onTest(saved.id, apiKey, apiUrl, modelId);
    setTesting(false);
  };

  const isOffline = (cat as any).isOffline;
  const isLmStudio = (cat as any).lmStudio;
  const showWizard = open && isOffline && !isLmStudio;
  const showLmInfo = open && isLmStudio;

  return (
    <Card className={`border transition-all ${isDefault ? "border-indigo-500/50 bg-indigo-500/5" : "border-border bg-card"}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: (cat as any).color || "#555" }}>
              {cat.provider.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{cat.label}</span>
                <Badge className={`text-xs px-1.5 py-0 ${catColor}`}>{catLabel}</Badge>
                {isDefault && <Badge className="text-xs px-1.5 py-0 bg-indigo-500/20 text-indigo-400">⭐ افتراضي</Badge>}
                {testStatus === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {testStatus === "failed" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{cat.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {saved && !isDefault && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-indigo-400" onClick={() => onSetDefault(saved.id)}>
                <Star className="w-3 h-3 mr-1" />افتراضي
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setOpen(!open)}>
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="mt-4 border-t border-border pt-4">
            {showWizard && (
              <OllamaWizard modelId={modelId} onConfigured={() => {
                onSave({ id: saved?.id, provider: cat.provider, modelId, label: cat.label, apiKey: "ollama-local", apiUrl, category: cat.category });
              }} />
            )}
            {showLmInfo && <LMStudioInfo />}

            {(!showWizard || saved) && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">API Key {isOffline && <span className="text-blue-400">(اختياري)</span>}</Label>
                    <div className="relative mt-1">
                      <Input type={showKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)}
                        placeholder={saved ? "محفوظ" : (cat as any).keyHint || "أدخل الـ Key"} className="h-8 text-xs pr-8" />
                      <button className="absolute right-2 top-2" onClick={() => setShowKey(!showKey)}>
                        {showKey ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                    {(cat as any).keyLink && (
                      <a href={(cat as any).keyLink} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-1">
                        <ExternalLink className="w-3 h-3" />احصل على Key
                      </a>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Model ID</Label>
                    <Input value={modelId} onChange={e => setModelId(e.target.value)} className="mt-1 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">API URL</Label>
                  <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} className="mt-1 h-8 text-xs font-mono" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600" onClick={handleSave}>حفظ</Button>
                  {saved && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleTest} disabled={testing}>
                        {testing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}اختبار
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => onDelete(saved.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
                {testStatus === "failed" && saved?.testError && (
                  <div className="text-xs text-red-400 bg-red-500/10 rounded p-2 break-all">{saved.testError}</div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Settings() {
  const [filter, setFilter] = useState<"all" | "cloud_free" | "cloud_paid" | "local">("all");

  const { data: llmList = [], refetch } = trpc.settings.getLlmConfigs.useQuery();
  const saveLlm     = trpc.settings.saveLlmConfig.useMutation({ onSuccess: () => { toast.success("تم الحفظ"); refetch(); }, onError: e => toast.error(e.message) });
  const deleteLlm   = trpc.settings.deleteLlmConfig.useMutation({ onSuccess: () => { toast.success("تم الحذف"); refetch(); }, onError: e => toast.error(e.message) });
  const testLlm     = trpc.settings.testLlmConfig.useMutation({ onSuccess: r => { if (r.success) toast.success("✓ الاتصال نجح!"); else toast.error(`فشل: ${r.error}`); refetch(); } });
  const setDefault  = trpc.settings.setDefaultLlm.useMutation({ onSuccess: () => { toast.success("تم تعيين النموذج الافتراضي"); refetch(); }, onError: e => toast.error(e.message) });

  const getSaved = (provider: string, modelId: string) => llmList.find(l => l.provider === provider && l.modelId === modelId);
  const defaultLlm = llmList.find(l => l.isDefault);
  const filtered = LLM_CATALOG.filter(c => filter === "all" || c.category === filter);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-indigo-400" />
          <div>
            <h1 className="font-semibold">إعدادات النماذج</h1>
            <p className="text-xs text-muted-foreground">اربط نماذج AI وأدرها من مكان واحد</p>
          </div>
        </div>
        {defaultLlm && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-3 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            افتراضي: <span className="text-foreground font-medium">{defaultLlm.label}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="max-w-3xl space-y-4">

          {/* Info */}
          <div className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3 flex items-start gap-2">
            <Brain className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <span>اختر نموذجاً، أدخل الـ API Key، اختبره، ثم اضغط <strong>"افتراضي"</strong> لتطبيقه على كل العمليات. النماذج الأوفلاين لا تحتاج إنترنت أو API Key.</span>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {([["all","الكل"],["cloud_free","☁️ مجاني"],["cloud_paid","💳 مدفوع"],["local","💻 أوفلاين"]] as const).map(([v, l]) => (
              <Button key={v} size="sm" variant={filter === v ? "default" : "outline"}
                className={`h-7 text-xs ${filter === v ? "bg-indigo-500 hover:bg-indigo-600" : ""}`}
                onClick={() => setFilter(v)}>{l}</Button>
            ))}
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {filtered.map(cat => (
              <LlmCard
                key={`${cat.provider}-${cat.modelId}`}
                cat={cat}
                saved={getSaved(cat.provider, cat.modelId)}
                onSave={d => saveLlm.mutate(d)}
                onTest={async (id, key, url, model) => { const r = await testLlm.mutateAsync({ id, apiKey: key || undefined, apiUrl: url, modelId: model }); return r.success; }}
                onDelete={id => deleteLlm.mutate({ id })}
                onSetDefault={id => setDefault.mutate({ id })}
              />
            ))}
          </div>

          {/* Custom saved configs not in catalog */}
          {llmList.filter(l => !LLM_CATALOG.some(c => c.provider === l.provider && c.modelId === l.modelId)).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">نماذج مخصصة</p>
              {llmList.filter(l => !LLM_CATALOG.some(c => c.provider === l.provider && c.modelId === l.modelId)).map(l => (
                <Card key={l.id} className="border-border"><CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{l.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{l.modelId}</span>
                    {l.isDefault && <Badge className="text-xs bg-indigo-500/20 text-indigo-400">افتراضي</Badge>}
                  </div>
                  <div className="flex gap-2">
                    {!l.isDefault && <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-400" onClick={() => setDefault.mutate({ id: l.id })}>افتراضي</Button>}
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => deleteLlm.mutate({ id: l.id })}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
