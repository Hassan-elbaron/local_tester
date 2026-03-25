/**
 * DesktopEnvironment — Ubuntu-like Desktop UI
 * Features: Dock, App Launcher, Window Manager, Top Panel, Workspaces
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Brain, LayoutDashboard, MessageSquare, FileText, CheckCircle,
  Bell, Users, ScrollText, Building2, Globe, LogOut, User,
  Maximize2, Minimize2, X, ChevronDown, Search, Grid3X3,
  Zap, Shield, Database, BarChart3, Settings, ChevronLeft,
  ChevronRight, Activity, Clock, Wifi, Battery, Volume2,
  Info, AlertTriangle, CheckSquare, XCircle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";

// ─── App Definitions ──────────────────────────────────────────────────────────
interface AppDef {
  id: string;
  label: string;
  labelAr: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  badge?: number;
  category: "core" | "operations" | "intelligence" | "settings";
}

const APP_DEFS: AppDef[] = [
  { id: "dashboard", label: "Dashboard", labelAr: "لوحة التحكم", icon: <LayoutDashboard className="w-5 h-5" />, path: "/", color: "from-indigo-500 to-indigo-600", category: "core" },
  { id: "chat", label: "Control Center", labelAr: "مركز التحكم", icon: <MessageSquare className="w-5 h-5" />, path: "/chat", color: "from-violet-500 to-violet-600", category: "core" },
  { id: "proposals", label: "Proposals", labelAr: "المقترحات", icon: <FileText className="w-5 h-5" />, path: "/proposals", color: "from-blue-500 to-blue-600", category: "operations" },
  { id: "approvals", label: "Approvals", labelAr: "الموافقات", icon: <CheckCircle className="w-5 h-5" />, path: "/approvals", color: "from-green-500 to-green-600", category: "operations" },
  { id: "notifications", label: "Notifications", labelAr: "الإشعارات", icon: <Bell className="w-5 h-5" />, path: "/notifications", color: "from-amber-500 to-amber-600", category: "operations" },
  { id: "pipeline", label: "Pipeline", labelAr: "خط السير", icon: <Globe className="w-5 h-5" />, path: "/pipeline", color: "from-orange-500 to-orange-600", category: "core" },
  { id: "strategy", label: "Strategy", labelAr: "الاستراتيجية", icon: <Activity className="w-5 h-5" />, path: "/strategy", color: "from-emerald-500 to-emerald-600", category: "core" },
  { id: "execution", label: "Execution", labelAr: "التنفيذ", icon: <Zap className="w-5 h-5" />, path: "/execution", color: "from-amber-500 to-amber-600", category: "core" },
  { id: "agents", label: "Agents", labelAr: "الوكلاء", icon: <Brain className="w-5 h-5" />, path: "/agents", color: "from-purple-500 to-purple-600", category: "intelligence" },
  { id: "intelligence", label: "Intelligence", labelAr: "الذكاء", icon: <Zap className="w-5 h-5" />, path: "/intelligence", color: "from-fuchsia-500 to-fuchsia-600", category: "intelligence" },
  { id: "audit", label: "Audit Log", labelAr: "سجل المراجعة", icon: <ScrollText className="w-5 h-5" />, path: "/audit", color: "from-slate-500 to-slate-600", category: "intelligence" },
  { id: "expansion", label: "Expansion Center", labelAr: "مركز التوسع", icon: <Shield className="w-5 h-5" />, path: "/expansion", color: "from-violet-500 to-violet-600", category: "intelligence" },
  { id: "companies", label: "Companies", labelAr: "الشركات", icon: <Building2 className="w-5 h-5" />, path: "/companies", color: "from-teal-500 to-teal-600", category: "settings" },
  { id: "settings", label: "Settings", labelAr: "الإعدادات", icon: <Settings className="w-5 h-5" />, path: "/settings", color: "from-slate-500 to-slate-600", category: "settings" },
];

// ─── Notifications Overlay ───────────────────────────────────────────────────
function NotificationsOverlay({ companyId, onClose }: { companyId: number; onClose: () => void }) {
  const { data: notifications = [] } = trpc.notifications.list.useQuery(
    { companyId },
    { enabled: !!companyId }
  );
  const markRead = trpc.notifications.markRead.useMutation();
  const markAll = trpc.notifications.markAllRead.useMutation();
  const utils = trpc.useUtils();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id, companyId }, {
      onSuccess: () => utils.notifications.unreadCount.invalidate(),
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "approval_needed": return <CheckSquare className="w-3.5 h-3.5 text-yellow-400" />;
      case "approval_decision": return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
      case "deliberation_complete": return <Brain className="w-3.5 h-3.5 text-purple-400" />;
      case "system": return <Info className="w-3.5 h-3.5 text-blue-400" />;
      default: return <Bell className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed top-9 right-0 w-80 max-h-[70vh] bg-black/90 backdrop-blur-xl border border-white/10 rounded-bl-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-semibold text-white">Notifications</span>
        <div className="flex items-center gap-2">
          {notifications.some((n: any) => !n.isRead) && (
            <button
              onClick={() => markAll.mutate({ companyId }, { onSuccess: () => utils.notifications.unreadCount.invalidate() })}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No notifications</div>
        ) : (
          notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkRead(n.id)}
              className={cn(
                "flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors",
                !n.isRead && "bg-indigo-500/5"
              )}
            >
              <div className="mt-0.5 flex-shrink-0">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-medium", n.isRead ? "text-white/60" : "text-white")}>{n.title}</p>
                <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-white/30 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Top Panel ────────────────────────────────────────────────────────────────
function TopPanel({
  onToggleLauncher,
  launcherOpen,
}: {
  onToggleLauncher: () => void;
  launcherOpen: boolean;
}) {
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const { currentCompany, companies, setCurrentCompany } = useCompany();
  const [time, setTime] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(
    { companyId: currentCompany?.id ?? 0 },
    { enabled: !!currentCompany?.id, refetchInterval: 30000 }
  );
  const unreadCount = typeof unreadData === "number" ? unreadData : 0;
  const [, navigate] = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-9 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center px-3 gap-2 z-50 flex-shrink-0 select-none">
      {/* Activities / Launcher Toggle */}
      <button
        onClick={onToggleLauncher}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all",
          launcherOpen
            ? "bg-white/20 text-white"
            : "text-white/70 hover:text-white hover:bg-white/10"
        )}
      >
        <Grid3X3 className="w-3.5 h-3.5" />
        <span>Activities</span>
      </button>

      {/* App Name */}
      <div className="flex items-center gap-1.5 text-white/50 text-xs">
        <Brain className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-white/80 font-medium">AI Marketing OS</span>
      </div>

      <div className="flex-1" />

      {/* System Tray */}
      <div className="flex items-center gap-1">
        {/* Notifications Bell */}
        <button
          onClick={() => setNotifOpen((v) => !v)}
          className={cn(
            "relative flex items-center justify-center w-7 h-7 rounded transition-colors",
            notifOpen ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/70 hover:text-white"
          )}
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && currentCompany && (
          <NotificationsOverlay
            companyId={currentCompany.id}
            onClose={() => setNotifOpen(false)}
          />
        )}

        {/* Language */}
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors text-xs"
        >
          <Globe className="w-3 h-3" />
          <span>{lang === "en" ? "EN" : "AR"}</span>
        </button>

        {/* Company Switcher */}
        {currentCompany && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors text-xs max-w-[140px]">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentCompany.primaryColor ?? "#6366f1" }}
                />
                <span className="truncate">{currentCompany.name}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Switch Company</div>
              <DropdownMenuSeparator />
              {companies.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => setCurrentCompany(c)}
                  className={cn("text-xs gap-2", c.id === currentCompany.id && "bg-accent")}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.primaryColor ?? "#6366f1" }} />
                  <span className="truncate">{c.name}</span>
                  {c.id === currentCompany.id && <CheckCircle className="w-3 h-3 ml-auto text-green-400" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Clock */}
        <div className="text-white/70 text-xs px-2 font-mono">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors">
              <div className="w-5 h-5 rounded-full bg-indigo-500/40 flex items-center justify-center">
                <User className="w-3 h-3 text-indigo-300" />
              </div>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{user?.name ?? "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer text-xs">
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── App Launcher (Activities Overview) ──────────────────────────────────────
function AppLauncher({ onClose }: { onClose: () => void }) {
  const { lang } = useI18n();
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = APP_DEFS.filter((app) => {
    const q = search.toLowerCase();
    return app.label.toLowerCase().includes(q) || app.labelAr.includes(q);
  });

  const categories = [
    { id: "core", label: "Core", color: "text-indigo-400" },
    { id: "operations", label: "Operations", color: "text-green-400" },
    { id: "intelligence", label: "Intelligence", color: "text-purple-400" },
    { id: "settings", label: "Settings", color: "text-slate-400" },
  ];

  const handleAppClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xl flex flex-col items-center pt-16 pb-8"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl px-4" onClick={(e) => e.stopPropagation()}>
        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
            className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-white/40 text-sm outline-none focus:border-indigo-400/60 focus:bg-white/15 transition-all"
          />
        </div>

        {/* Apps Grid */}
        {search ? (
          <div className="grid grid-cols-4 gap-4">
            {filtered.map((app) => (
              <AppIcon key={app.id} app={app} lang={lang} onClick={() => handleAppClick(app.path)} launcher />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => {
              const apps = APP_DEFS.filter((a) => a.category === cat.id);
              return (
                <div key={cat.id}>
                  <p className={cn("text-xs font-semibold uppercase tracking-wider mb-3", cat.color)}>{cat.label}</p>
                  <div className="grid grid-cols-4 gap-4">
                    {apps.map((app) => (
                      <AppIcon key={app.id} app={app} lang={lang} onClick={() => handleAppClick(app.path)} launcher />
                    ))}
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

// ─── App Icon ─────────────────────────────────────────────────────────────────
function AppIcon({
  app, lang, onClick, launcher = false, active = false, badge,
}: {
  app: AppDef; lang: string; onClick: () => void;
  launcher?: boolean; active?: boolean; badge?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const label = lang === "ar" ? app.labelAr : app.label;

  if (launcher) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-all group"
      >
        <div className={cn(
          "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
          app.color
        )}>
          <div className="text-white">{app.icon}</div>
        </div>
        <span className="text-xs text-white/80 text-center leading-tight">{label}</span>
      </button>
    );
  }

  // Dock icon
  return (
    <div className="relative flex flex-col items-center" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Tooltip */}
      {hovered && (
        <div className="absolute bottom-full mb-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap pointer-events-none">
          {label}
        </div>
      )}
      <button
        onClick={onClick}
        className={cn(
          "relative w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-all duration-200",
          app.color,
          hovered ? "scale-125 -translate-y-2" : active ? "scale-110" : "scale-100"
        )}
      >
        <div className="text-white">{app.icon}</div>
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </button>
      {/* Active indicator */}
      {active && <div className="w-1 h-1 rounded-full bg-white/60 mt-1" />}
    </div>
  );
}

// ─── Dock ─────────────────────────────────────────────────────────────────────
function Dock({ currentPath }: { currentPath: string }) {
  const { lang } = useI18n();
  const { currentCompany } = useCompany();
  const [, navigate] = useLocation();
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(
    { companyId: currentCompany?.id ?? 0 },
    { enabled: !!currentCompany?.id, refetchInterval: 30000 }
  );
  const unreadCount = typeof unreadData === "number" ? unreadData : 0;

  const dockApps = APP_DEFS.slice(0, 6); // First 6 apps in dock

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-end gap-2 px-4 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
      {dockApps.map((app) => (
        <AppIcon
          key={app.id}
          app={app}
          lang={lang}
          onClick={() => navigate(app.path)}
          active={currentPath === app.path || (app.path !== "/" && currentPath.startsWith(app.path))}
          badge={app.id === "notifications" ? unreadCount : undefined}
        />
      ))}
      <div className="w-px h-8 bg-white/20 mx-1" />
      {APP_DEFS.slice(6).map((app) => (
        <AppIcon
          key={app.id}
          app={app}
          lang={lang}
          onClick={() => navigate(app.path)}
          active={currentPath === app.path}
        />
      ))}
    </div>
  );
}

// ─── Window Frame ─────────────────────────────────────────────────────────────
function WindowFrame({
  title,
  children,
  onClose,
  fullscreen = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  fullscreen?: boolean;
}) {
  const [maximized, setMaximized] = useState(false);

  return (
    <div className={cn(
      "flex flex-col bg-background border border-white/10 rounded-xl shadow-2xl overflow-hidden",
      maximized || fullscreen ? "fixed inset-0 z-30 rounded-none" : "h-full"
    )}>
      {/* Title Bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-card border-b border-border select-none flex-shrink-0">
        {/* Traffic Lights */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center group"
          >
            <X className="w-2 h-2 text-red-900 opacity-0 group-hover:opacity-100" />
          </button>
          <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors" />
          <button
            onClick={() => setMaximized(!maximized)}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors flex items-center justify-center group"
          >
            {maximized
              ? <Minimize2 className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
              : <Maximize2 className="w-2 h-2 text-green-900 opacity-0 group-hover:opacity-100" />
            }
          </button>
        </div>
        <span className="flex-1 text-center text-xs font-medium text-muted-foreground">{title}</span>
        <div className="w-14" />
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

// ─── Desktop Environment ──────────────────────────────────────────────────────
export default function DesktopEnvironment({ children }: { children: React.ReactNode }) {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [location] = useLocation();
  const { lang } = useI18n();
  const isRTL = lang === "ar";

  const currentApp = APP_DEFS.find((a) =>
    a.path === location || (a.path !== "/" && location.startsWith(a.path))
  );
  const windowTitle = currentApp
    ? (lang === "ar" ? currentApp.labelAr : currentApp.label)
    : "AI Marketing OS";

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && launcherOpen) setLauncherOpen(false);
    if ((e.metaKey || e.ctrlKey) && e.key === "F1") setLauncherOpen((v) => !v);
  }, [launcherOpen]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Close launcher on navigation
  useEffect(() => {
    setLauncherOpen(false);
  }, [location]);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        background: "radial-gradient(ellipse at 20% 50%, oklch(0.18 0.04 270) 0%, oklch(0.12 0.02 270) 50%, oklch(0.09 0.01 270) 100%)",
      }}
    >
      {/* Top Panel */}
      <TopPanel
        onToggleLauncher={() => setLauncherOpen((v) => !v)}
        launcherOpen={launcherOpen}
      />

      {/* App Launcher Overlay */}
      {launcherOpen && (
        <AppLauncher onClose={() => setLauncherOpen(false)} />
      )}

      {/* Desktop Content Area */}
      <div className="flex-1 overflow-hidden pb-24 pt-2 px-2">
        <WindowFrame title={windowTitle}>
          {children}
        </WindowFrame>
      </div>

      {/* Dock */}
      <Dock currentPath={location} />
    </div>
  );
}
