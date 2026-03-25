import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Brain, LayoutDashboard, MessageSquare, FileText, CheckCircle,
  Bell, Bot, ClipboardList, Building2, Database, ChevronDown,
  Menu, X, Globe, LogOut, User, ChevronRight, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  key: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang, isRTL } = useI18n();
  const { currentCompany, companies, setCurrentCompany } = useCompany();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const companyId = currentCompany?.id ?? 0;

  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(
    { companyId },
    { enabled: companyId > 0, refetchInterval: 30000 }
  );
  const { data: pendingApprovals = [] } = trpc.approvals.pending.useQuery(
    { companyId },
    { enabled: companyId > 0, refetchInterval: 30000 }
  );

  const navItems: NavItem[] = [
    { key: "nav.dashboard", path: "/", icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: "nav.chat", path: "/chat", icon: <MessageSquare className="w-4 h-4" /> },
    { key: "nav.proposals", path: "/proposals", icon: <FileText className="w-4 h-4" /> },
    { key: "nav.approvals", path: "/approvals", icon: <CheckCircle className="w-4 h-4" />, badge: pendingApprovals.length },
    { key: "nav.notifications", path: "/notifications", icon: <Bell className="w-4 h-4" />, badge: unreadCount },
    { key: "nav.agents", path: "/agents", icon: <Bot className="w-4 h-4" /> },
    { key: "nav.audit", path: "/audit", icon: <ClipboardList className="w-4 h-4" /> },
    { key: "nav.companies", path: "/companies", icon: <Building2 className="w-4 h-4" /> },
  ];

  const isActive = (path: string) => path === "/" ? location === "/" : location.startsWith(path);

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border",
      mobile ? "w-72" : sidebarOpen ? "w-64" : "w-16",
      "transition-all duration-200"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-4 border-b border-sidebar-border",
        !sidebarOpen && !mobile && "justify-center px-2"
      )}>
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/30">
          <Brain className="w-5 h-5 text-white" />
        </div>
        {(sidebarOpen || mobile) && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground truncate">AI Marketing OS</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">v2.0 Production</p>
          </div>
        )}
      </div>

      {/* Company Switcher */}
      {(sidebarOpen || mobile) && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between text-xs h-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
                  <span className="truncate">{currentCompany?.name ?? t("company.select")}</span>
                </div>
                <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              {companies.map((company) => (
                <DropdownMenuItem
                  key={company.id}
                  onClick={() => setCurrentCompany(company)}
                  className={cn("cursor-pointer", currentCompany?.id === company.id && "bg-accent")}
                >
                  <Building2 className="w-4 h-4 mr-2 text-indigo-400" />
                  <span className="truncate">{company.name}</span>
                  {currentCompany?.id === company.id && <ChevronRight className="w-3 h-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/companies" className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  {t("company.add")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all",
              isActive(item.path)
                ? "bg-indigo-500/20 text-indigo-400 font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              !sidebarOpen && !mobile && "justify-center px-2"
            )}>
              <span className={cn("flex-shrink-0", isActive(item.path) && "text-indigo-400")}>
                {item.icon}
              </span>
              {(sidebarOpen || mobile) && (
                <>
                  <span className="flex-1 truncate">{t(item.key)}</span>
                  {item.badge && item.badge > 0 ? (
                    <Badge className="bg-indigo-500 text-white text-xs px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  ) : null}
                </>
              )}
            </div>
          </Link>
        ))}
      </nav>

      {/* Bottom: Language + User */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        {/* Language Toggle */}
        {(sidebarOpen || mobile) && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
          >
            <Globe className="w-4 h-4" />
            {lang === "en" ? "العربية" : "English"}
          </Button>
        )}
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={cn(
              "w-full gap-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground",
              sidebarOpen || mobile ? "justify-start" : "justify-center px-2"
            )}>
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              {(sidebarOpen || mobile) && (
                <span className="truncate">{user?.name ?? "Admin"}</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
              {user?.email ?? ""}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              {t("auth.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative z-10 flex flex-col h-full">
            <Sidebar mobile />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-20 text-white"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <Button variant="ghost" size="icon" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-sm">AI Marketing OS</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex items-center justify-between px-4 py-2 border-b border-border bg-background/50 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          {currentCompany && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentCompany.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Link href="/notifications">
                <Button variant="ghost" size="sm" className="relative text-muted-foreground">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-[10px] text-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
