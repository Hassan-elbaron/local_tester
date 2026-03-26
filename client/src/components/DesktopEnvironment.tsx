/**
 * DesktopEnvironment — Ubuntu-style OS UI
 * Left sidebar dock · Top panel · Animated Chat Launcher · Window frame
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Brain, LayoutDashboard, FileText, CheckCircle, Bell,
  ScrollText, Building2, Globe, LogOut, User, X,
  ChevronDown, Search, Zap, Shield, Database, BarChart3,
  Settings, Activity, Clock, Info, CheckSquare, MessageSquare,
  Send, Loader2, Target, TrendingUp, Eye, BookOpen,
  Cpu, AlertTriangle, Map, Users, Radar, Lightbulb,
  SlidersHorizontal, Grid3x3, Minimize2, Maximize2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";

// ─── App Definitions ──────────────────────────────────────────────────────────
interface AppDef {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  group: "core" | "ops" | "analytics" | "learning" | "system";
}

const APP_DEFS: AppDef[] = [
  // ── Core ──
  { id: "dashboard",  labelKey: "nav.dashboard",  icon: <LayoutDashboard className="w-5 h-5" />, path: "/",          color: "from-indigo-500 to-indigo-600",  group: "core" },
  { id: "pipeline",   labelKey: "nav.pipeline",   icon: <Map className="w-5 h-5" />,             path: "/pipeline",  color: "from-orange-500 to-orange-600",  group: "core" },
  { id: "strategy",   labelKey: "nav.strategy",   icon: <Target className="w-5 h-5" />,          path: "/strategy",  color: "from-emerald-500 to-emerald-600",group: "core" },
  { id: "execution",  labelKey: "nav.execution",  icon: <Zap className="w-5 h-5" />,             path: "/execution", color: "from-amber-500 to-amber-600",    group: "core" },
  // ── Operations ──
  { id: "proposals",     labelKey: "nav.proposals",     icon: <FileText className="w-5 h-5" />,   path: "/proposals",     color: "from-blue-500 to-blue-600",   group: "ops" },
  { id: "approvals",     labelKey: "nav.approvals",     icon: <CheckCircle className="w-5 h-5" />,path: "/approvals",     color: "from-green-500 to-green-600", group: "ops" },
  { id: "notifications", labelKey: "nav.notifications", icon: <Bell className="w-5 h-5" />,       path: "/notifications", color: "from-yellow-500 to-yellow-600",group: "ops" },
  // ── Analytics ──
  { id: "monitoring",  labelKey: "nav.monitoring",  icon: <Activity className="w-5 h-5" />,    path: "/monitoring",  color: "from-cyan-500 to-cyan-600",    group: "analytics" },
  { id: "seo",         labelKey: "nav.seo",         icon: <TrendingUp className="w-5 h-5" />,  path: "/seo",         color: "from-lime-500 to-lime-600",    group: "analytics" },
  { id: "brand",       labelKey: "nav.brand",       icon: <Shield className="w-5 h-5" />,      path: "/brand",       color: "from-pink-500 to-pink-600",    group: "analytics" },
  { id: "customers",   labelKey: "nav.customers",   icon: <Users className="w-5 h-5" />,       path: "/customers",   color: "from-rose-500 to-rose-600",    group: "analytics" },
  { id: "behavior",    labelKey: "nav.behavior",    icon: <Eye className="w-5 h-5" />,         path: "/behavior",    color: "from-violet-500 to-violet-600",group: "analytics" },
  { id: "predictions", labelKey: "nav.predictions", icon: <Radar className="w-5 h-5" />,       path: "/predictions", color: "from-purple-500 to-purple-600",group: "analytics" },
  { id: "decisions",   labelKey: "nav.decisions",   icon: <Lightbulb className="w-5 h-5" />,   path: "/decisions",   color: "from-amber-600 to-orange-600", group: "analytics" },
  { id: "intelligence",labelKey: "nav.intelligence",icon: <Brain className="w-5 h-5" />,       path: "/intelligence",color: "from-fuchsia-500 to-fuchsia-600",group:"analytics"},
  // ── Learning ──
  { id: "learning", labelKey: "nav.learning", icon: <BookOpen className="w-5 h-5" />, path: "/learning", color: "from-teal-500 to-teal-600",   group: "learning" },
  { id: "skills",   labelKey: "nav.skills",   icon: <Cpu className="w-5 h-5" />,     path: "/skills",   color: "from-purple-500 to-purple-600",group: "learning" },
  { id: "agents",   labelKey: "nav.agents",   icon: <BarChart3 className="w-5 h-5" />,path: "/agents",  color: "from-indigo-600 to-indigo-700", group: "learning" },
  { id: "expansion",labelKey: "nav.expansion",icon: <Globe className="w-5 h-5" />,   path: "/expansion",color: "from-violet-500 to-violet-600", group: "learning" },
  // ── System ──
  { id: "companies", labelKey: "nav.companies", icon: <Building2 className="w-5 h-5" />,  path: "/companies", color: "from-teal-500 to-teal-600",  group: "system" },
  { id: "audit",     labelKey: "nav.audit",     icon: <ScrollText className="w-5 h-5" />, path: "/audit",     color: "from-slate-500 to-slate-600", group: "system" },
  { id: "settings",  labelKey: "nav.settings",  icon: <Settings className="w-5 h-5" />,   path: "/settings",  color: "from-slate-600 to-slate-700", group: "system" },
];

const DOCK_GROUPS: { id: AppDef["group"]; labelKey: string }[] = [
  { id: "core",      labelKey: "desktop.group.core" },
  { id: "ops",       labelKey: "desktop.group.ops" },
  { id: "analytics", labelKey: "desktop.group.analytics" },
  { id: "learning",  labelKey: "desktop.group.learning" },
  { id: "system",    labelKey: "desktop.group.system" },
];

// ─── Notifications Panel ──────────────────────────────────────────────────────
function NotifPanel({ companyId, onClose }: { companyId: number; onClose: () => void }) {
  const { t } = useI18n();
  const { data: notifs = [] } = trpc.notifications.list.useQuery({ companyId }, { enabled: !!companyId });
  const markRead = trpc.notifications.markRead.useMutation();
  const markAll  = trpc.notifications.markAllRead.useMutation();
  const utils = trpc.useUtils();

  const icon = (type: string) => {
    if (type === "approval_needed")    return <CheckSquare className="w-3.5 h-3.5 text-yellow-400" />;
    if (type === "approval_decision")  return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
    if (type === "deliberation_complete") return <Brain className="w-3.5 h-3.5 text-purple-400" />;
    if (type === "system")             return <Info className="w-3.5 h-3.5 text-blue-400" />;
    return <Bell className="w-3.5 h-3.5 text-indigo-400" />;
  };

  return (
    <div className="fixed top-9 end-0 w-80 max-h-[70vh] bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-bl-2xl shadow-2xl z-[60] flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <span className="text-sm font-semibold text-white">{t("notification.title")}</span>
        <div className="flex items-center gap-2">
          {notifs.some((n: any) => !n.isRead) && (
            <button onClick={() => markAll.mutate({ companyId }, { onSuccess: () => utils.notifications.unreadCount.invalidate() })}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              {t("notification.markAllRead")}
            </button>
          )}
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {notifs.length === 0
          ? <div className="py-10 text-center text-white/30 text-sm">{t("notification.allCaughtUp")}</div>
          : notifs.map((n: any) => (
            <div key={n.id} onClick={() => !n.isRead && markRead.mutate({ id: n.id, companyId }, { onSuccess: () => utils.notifications.unreadCount.invalidate() })}
              className={cn("flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors", !n.isRead && "bg-indigo-500/5")}>
              <div className="mt-0.5 flex-shrink-0">{icon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-medium", n.isRead ? "text-white/50" : "text-white")}>{n.title}</p>
                <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-white/25 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />}
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Chat Launcher Panel ──────────────────────────────────────────────────────
function ChatLauncherPanel({ onClose, companyId, companyName }: {
  onClose: () => void; companyId: number; companyName: string;
}) {
  const { t, lang } = useI18n();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const { data: history = [] } = trpc.commandCenter.getHistory.useQuery(
    { companyId, limit: 30 }, { enabled: !!companyId }
  );

  const sendMsg = trpc.commandCenter.sendMessage.useMutation({
    onSuccess: () => { setSending(false); utils.commandCenter.getHistory.invalidate(); setInput(""); },
    onError:   () => setSending(false),
  });
  const utils = trpc.useUtils();

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    sendMsg.mutate({ companyId, message: msg });
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const quickCmds = [
    t("command.suggested.1"),
    t("command.suggested.2"),
    t("command.suggested.3"),
    t("command.suggested.4"),
  ];

  return (
    <div className="fixed top-9 end-1 w-[420px] h-[560px] bg-[#0f0f1a]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-[70] flex flex-col overflow-hidden"
      style={{ animation: "chatLauncherIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0 bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{t("command.title")}</p>
            {companyName && <p className="text-[10px] text-white/40">{companyName}</p>}
          </div>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {history.length === 0 ? (
          <div className="space-y-4 pt-4">
            <div className="text-center">
              <Brain className="w-10 h-10 text-violet-400/40 mx-auto mb-2" />
              <p className="text-xs text-white/30">{t("command.empty")}</p>
            </div>
            <div className="space-y-1.5">
              {quickCmds.map((cmd, i) => (
                <button key={i} onClick={() => setInput(cmd)}
                  className="w-full text-start text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 transition-colors border border-white/5 hover:border-white/10">
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        ) : (
          history.map((msg: any) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? (lang === "ar" ? "justify-start" : "justify-end") : (lang === "ar" ? "justify-end" : "justify-start"))}>
              <div className={cn("max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-indigo-600/80 text-white rounded-br-sm"
                  : "bg-white/8 text-white/80 border border-white/8 rounded-bl-sm"
              )}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className={cn("flex", lang === "ar" ? "justify-end" : "justify-start")}>
            <div className="bg-white/8 border border-white/8 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
              <span className="text-xs text-white/40">…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/8 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={2}
            placeholder={t("command.placeholder")}
            className="flex-1 bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500/50 resize-none transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 flex items-center justify-center transition-all flex-shrink-0 mb-0.5"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Top Panel ────────────────────────────────────────────────────────────────
function TopPanel({ onToggleLauncher, launcherOpen }: {
  onToggleLauncher: () => void; launcherOpen: boolean;
}) {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const { currentCompany, companies, setCurrentCompany } = useCompany();
  const [time, setTime] = useState(new Date());
  const [notifOpen, setNotifOpen]   = useState(false);
  const [chatOpen,  setChatOpen]    = useState(false);
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(
    { companyId: currentCompany?.id ?? 0 },
    { enabled: !!currentCompany?.id, refetchInterval: 30000 }
  );
  const unreadCount = typeof unreadData === "number" ? unreadData : 0;

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-9 bg-[#200030]/90 backdrop-blur-md border-b border-white/8 flex items-center px-3 gap-2 z-50 flex-shrink-0 select-none">

      {/* Activities */}
      <button onClick={onToggleLauncher}
        className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all",
          launcherOpen ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10")}>
        <Grid3x3 className="w-3.5 h-3.5" />
        <span>{t("desktop.activities")}</span>
      </button>

      {/* Logo */}
      <div className="flex items-center gap-1.5 text-white/60 text-xs">
        <Brain className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-white/80 font-semibold">{t("desktop.appName")}</span>
      </div>

      <div className="flex-1" />

      {/* ── Chat Launcher ── */}
      <button
        onClick={() => { setChatOpen(v => !v); setNotifOpen(false); }}
        className={cn(
          "relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
          chatOpen
            ? "bg-violet-600/40 border-violet-500/50 text-white"
            : "border-violet-500/20 text-violet-300 hover:bg-violet-600/20 hover:border-violet-500/40 hover:text-white"
        )}
        title={t("command.title")}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("nav.command")}</span>
      </button>

      {chatOpen && currentCompany && (
        <ChatLauncherPanel
          onClose={() => setChatOpen(false)}
          companyId={currentCompany.id}
          companyName={currentCompany.name}
        />
      )}

      {/* Notifications */}
      <button
        onClick={() => { setNotifOpen(v => !v); setChatOpen(false); }}
        className={cn("relative flex items-center justify-center w-7 h-7 rounded transition-colors",
          notifOpen ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/70 hover:text-white")}>
        <Bell className="w-3.5 h-3.5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 end-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {notifOpen && currentCompany && (
        <NotifPanel companyId={currentCompany.id} onClose={() => setNotifOpen(false)} />
      )}

      {/* Language Toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setLang(lang === "en" ? "ar" : "en"); }}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors text-xs font-semibold border border-white/10 hover:border-white/20"
      >
        <Globe className="w-3 h-3" />
        <span>{lang === "en" ? "AR" : "EN"}</span>
      </button>

      {/* Company Switcher */}
      {currentCompany && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors text-xs max-w-[130px]">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentCompany.primaryColor ?? "#6366f1" }} />
              <span className="truncate">{currentCompany.name}</span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{t("company.switcher")}</div>
            <DropdownMenuSeparator />
            {companies.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => setCurrentCompany(c)}
                className={cn("text-xs gap-2 cursor-pointer", c.id === currentCompany.id && "bg-accent")}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.primaryColor ?? "#6366f1" }} />
                <span className="truncate">{c.name}</span>
                {c.id === currentCompany.id && <CheckCircle className="w-3 h-3 ms-auto text-green-400" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Clock */}
      <div className="text-white/60 text-xs font-mono px-1 tabular-nums">
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>

      {/* User */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 px-1 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors">
            <div className="w-5 h-5 rounded-full bg-violet-500/40 flex items-center justify-center">
              <User className="w-3 h-3 text-violet-300" />
            </div>
            <ChevronDown className="w-3 h-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{user?.name ?? "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer text-xs">
            <LogOut className="w-3.5 h-3.5 me-2" />
            {t("auth.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── App Launcher Overlay ──────────────────────────────────────────────────────
function AppLauncher({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = APP_DEFS.filter((a) => t(a.labelKey).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-2xl flex flex-col items-center pt-16 pb-8 animate-in fade-in duration-150"
      onClick={onClose}>
      <div className="w-full max-w-2xl px-4" onClick={(e) => e.stopPropagation()}>
        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input ref={inputRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("desktop.searchApps")}
            className="w-full bg-white/10 border border-white/20 rounded-2xl ps-12 pe-4 py-3.5 text-white placeholder-white/40 text-sm outline-none focus:border-violet-400/60 focus:bg-white/15 transition-all" />
        </div>

        {search ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {filtered.map((app) => <LauncherIcon key={app.id} app={app} onClick={() => { navigate(app.path); onClose(); }} />)}
          </div>
        ) : (
          <div className="space-y-6">
            {DOCK_GROUPS.map((grp) => {
              const apps = APP_DEFS.filter((a) => a.group === grp.id);
              const colors: Record<string, string> = { core: "text-indigo-400", ops: "text-green-400", analytics: "text-cyan-400", learning: "text-teal-400", system: "text-slate-400" };
              return (
                <div key={grp.id}>
                  <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3", colors[grp.id])}>{t(grp.labelKey)}</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {apps.map((app) => <LauncherIcon key={app.id} app={app} onClick={() => { navigate(app.path); onClose(); }} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function LauncherIcon({ app, onClick }: { app: AppDef; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all group">
      <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", app.color)}>
        <div className="text-white">{app.icon}</div>
      </div>
      <span className="text-[11px] text-white/70 text-center leading-tight group-hover:text-white transition-colors">{t(app.labelKey)}</span>
    </button>
  );
}

// ─── Left Sidebar Dock ────────────────────────────────────────────────────────
function SidebarDock({ currentPath }: { currentPath: string }) {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const { currentCompany } = useCompany();
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(
    { companyId: currentCompany?.id ?? 0 },
    { enabled: !!currentCompany?.id, refetchInterval: 30000 }
  );
  const unreadCount = typeof unreadData === "number" ? unreadData : 0;

  return (
    <div className="w-14 flex-shrink-0 flex flex-col items-center py-2 gap-0.5 overflow-y-auto bg-[#0a0a14]/80 border-e border-white/8 backdrop-blur-md scrollbar-none">
      {DOCK_GROUPS.map((grp, gi) => (
        <div key={grp.id} className="w-full flex flex-col items-center gap-0.5">
          {gi > 0 && <div className="w-7 h-px bg-white/10 my-1.5" />}
          {APP_DEFS.filter((a) => a.group === grp.id).map((app) => {
            const isActive = app.path === "/"
              ? currentPath === "/"
              : currentPath === app.path || currentPath.startsWith(app.path + "/");
            const badge = app.id === "notifications" ? unreadCount : 0;
            return (
              <DockIcon key={app.id} app={app} active={isActive} badge={badge}
                onClick={() => navigate(app.path)} tooltip={t(app.labelKey)} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function DockIcon({ app, active, badge, onClick, tooltip }: {
  app: AppDef; active: boolean; badge: number; onClick: () => void; tooltip: string;
}) {
  const [hovered, setHovered] = useState(false);
  const { lang } = useI18n();

  return (
    <div className="relative flex items-center w-full px-1"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      {/* Active indicator bar */}
      {active && (
        <div className="absolute start-0 w-0.5 h-7 bg-white rounded-full" />
      )}

      <button onClick={onClick}
        className={cn(
          "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 mx-auto",
          active
            ? `bg-gradient-to-br ${app.color} shadow-lg scale-100`
            : "text-white/50 hover:text-white hover:bg-white/10",
          hovered && !active && "scale-110"
        )}>
        <div className={cn("transition-colors", active ? "text-white" : "text-white/50 hover:text-white")}>
          {app.icon}
        </div>
        {badge > 0 && (
          <span className="absolute -top-1 -end-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {hovered && (
        <div className={cn(
          "absolute z-50 px-2 py-1 bg-[#1a1a2e]/95 border border-white/10 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none shadow-lg",
          lang === "ar" ? "end-full me-2" : "start-full ms-2"
        )}>
          {tooltip}
          <div className={cn("absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#1a1a2e] border-white/10 rotate-45",
            lang === "ar" ? "start-full border-t border-e -ms-1" : "end-full border-b border-s -me-1")} />
        </div>
      )}
    </div>
  );
}

// ─── Window Frame ─────────────────────────────────────────────────────────────
function WindowFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const [maximized, setMaximized] = useState(true);

  return (
    <div className={cn(
      "flex flex-col bg-background/95 overflow-hidden h-full",
      !maximized && "border border-white/10 rounded-xl shadow-2xl"
    )}>
      {/* Title Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-card/80 border-b border-border/50 select-none flex-shrink-0 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-red-400 transition-colors cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-yellow-300 transition-colors" />
          <button onClick={() => setMaximized(!maximized)}
            className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-green-400 transition-colors flex items-center justify-center group">
            {maximized
              ? <Minimize2 className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
              : <Maximize2 className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />}
          </button>
        </div>
        <span className="flex-1 text-center text-xs font-medium text-muted-foreground/70">{title}</span>
        <div className="w-14" />
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

// ─── Desktop Environment ──────────────────────────────────────────────────────
export default function DesktopEnvironment({ children }: { children: React.ReactNode }) {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [location] = useLocation();
  const { lang, t } = useI18n();

  const currentApp = APP_DEFS.find((a) =>
    a.path === "/" ? location === "/" : location === a.path || location.startsWith(a.path + "/")
  );
  const windowTitle = currentApp ? t(currentApp.labelKey) : t("desktop.appName");

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && launcherOpen) setLauncherOpen(false);
    if ((e.metaKey || e.ctrlKey) && e.key === "F1") setLauncherOpen(v => !v);
  }, [launcherOpen]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => { setLauncherOpen(false); }, [location]);

  return (
    <>
      {/* Chat launcher animation keyframes */}
      <style>{`
        @keyframes chatLauncherIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>

      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        dir={lang === "ar" ? "rtl" : "ltr"}
        style={{
          background: "radial-gradient(ellipse at 15% 50%, #120020 0%, #090912 55%, #060608 100%)",
        }}
      >
        {/* Top Panel */}
        <TopPanel
          onToggleLauncher={() => setLauncherOpen(v => !v)}
          launcherOpen={launcherOpen}
        />

        {/* App Launcher */}
        {launcherOpen && <AppLauncher onClose={() => setLauncherOpen(false)} />}

        {/* Body: Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          <SidebarDock currentPath={location} />

          {/* Main workspace */}
          <div className="flex-1 overflow-hidden p-2">
            <WindowFrame title={windowTitle}>
              {children}
            </WindowFrame>
          </div>
        </div>
      </div>
    </>
  );
}
