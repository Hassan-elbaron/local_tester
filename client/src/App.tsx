import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/i18nContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { useAuth } from "./_core/hooks/useAuth";
import DesktopEnvironment from "./components/DesktopEnvironment";
import Dashboard from "./pages/Dashboard";
import ChatControl from "./pages/ChatControl";
import Proposals from "./pages/Proposals";
import ProposalDetail from "./pages/ProposalDetail";
import Approvals from "./pages/Approvals";
import Notifications from "./pages/Notifications";
import Agents from "./pages/Agents";
import AuditLog from "./pages/AuditLog";
import Companies from "./pages/Companies";
import Intelligence from "./pages/Intelligence";
import ExpansionCenter from "./pages/ExpansionCenter";
import Pipeline from "./pages/Pipeline";
import Strategy from "./pages/Strategy";
import Execution from "./pages/Execution";
import Settings from "./pages/Settings";
import CommandCenter from "./pages/CommandCenter";
import LearningPage from "./pages/LearningPage";
import SkillsHub from "./pages/SkillsHub";
import Monitoring from "./pages/Monitoring";
import SeoPage from "./pages/SeoPage";
import BrandPage from "./pages/BrandPage";
import CustomersPage from "./pages/CustomersPage";
import BehaviorPage from "./pages/BehaviorPage";
import PredictionsPage from "./pages/PredictionsPage";
import DecisionsPage from "./pages/DecisionsPage";
import RunsPage from "./pages/RunsPage";
import RunDetailPage from "./pages/RunDetailPage";
import BrainApprovalsPage from "./pages/BrainApprovalsPage";
import ExecutionsPage from "./pages/ExecutionsPage";
import ExecutionDetailPage from "./pages/ExecutionDetailPage";
import MemoryPage from "./pages/MemoryPage";
import MemoryDetailPage from "./pages/MemoryDetailPage";
import ObservabilityPage from "./pages/ObservabilityPage";
import BrandAuditPage from "./pages/BrandAuditPage";
import StrategyFlowPage from "./pages/StrategyFlowPage";
import CampaignLaunchPage from "./pages/CampaignLaunchPage";
import ContentCalendarPage from "./pages/ContentCalendarPage";
import OptimizationLoopPage from "./pages/OptimizationLoopPage";
import FlowsIndexPage from "./pages/FlowsIndexPage";
import DemoPage from "./pages/DemoPage";
import { getLoginUrl } from "./const";
import { Button } from "@/components/ui/button";
import { Brain, Loader2 } from "lucide-react";

const DEV_MODE = !import.meta.env.VITE_OAUTH_PORTAL_URL;

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (DEV_MODE) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Brain className="w-12 h-12 text-primary animate-pulse" />
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="text-center space-y-6 p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white">AI Marketing OS</h1>
              <p className="text-indigo-300 text-sm">Multi-Agent Marketing Platform</p>
            </div>
          </div>
          <p className="text-slate-400 max-w-sm mx-auto">
            Your intelligent marketing platform powered by 13 specialized AI agents working in concert.
          </p>
          <Button
            size="lg"
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 shadow-lg shadow-indigo-500/30"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/chat" component={ChatControl} />
      <Route path="/proposals" component={Proposals} />
      <Route path="/proposals/:id" component={ProposalDetail} />
      <Route path="/approvals" component={Approvals} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/agents" component={Agents} />
      <Route path="/audit" component={AuditLog} />
      <Route path="/intelligence" component={Intelligence} />
      <Route path="/expansion" component={ExpansionCenter} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/strategy" component={Strategy} />
      <Route path="/execution" component={Execution} />
      <Route path="/companies" component={Companies} />
      <Route path="/settings" component={Settings} />
      <Route path="/command" component={CommandCenter} />
      <Route path="/learning" component={LearningPage} />
      <Route path="/skills" component={SkillsHub} />
      <Route path="/monitoring" component={Monitoring} />
      <Route path="/seo" component={SeoPage} />
      <Route path="/brand" component={BrandPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/behavior" component={BehaviorPage} />
      <Route path="/predictions" component={PredictionsPage} />
      <Route path="/decisions" component={DecisionsPage} />
      <Route path="/runs" component={RunsPage} />
      <Route path="/runs/:taskId" component={RunDetailPage} />
      <Route path="/brain-approvals" component={BrainApprovalsPage} />
      <Route path="/executions" component={ExecutionsPage} />
      <Route path="/executions/:taskId" component={ExecutionDetailPage} />
      <Route path="/memory" component={MemoryPage} />
      <Route path="/memory/:key" component={MemoryDetailPage} />
      <Route path="/observability" component={ObservabilityPage} />
      <Route path="/brand-audit" component={BrandAuditPage} />
      <Route path="/strategy-flow" component={StrategyFlowPage} />
      <Route path="/campaign-launch" component={CampaignLaunchPage} />
      <Route path="/content-calendar" component={ContentCalendarPage} />
      <Route path="/optimization-loop" component={OptimizationLoopPage} />
      <Route path="/flows" component={FlowsIndexPage} />
      <Route path="/demo" component={DemoPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <AuthGate>
              <CompanyProvider>
                <DesktopEnvironment>
                  <Router />
                </DesktopEnvironment>
              </CompanyProvider>
            </AuthGate>
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
