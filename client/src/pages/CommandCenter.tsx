/**
 * Command Center — Intelligent Project Control Interface
 * Not a general chatbot. A full system control layer.
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Brain, Send, Zap, BarChart3, Shield, Users, GitBranch,
  Search, TrendingUp, MessageSquare, Loader2, Terminal,
  ChevronRight, Activity, AlertCircle,
} from "lucide-react";

const QUICK_COMMANDS = [
  { label: "Pipeline Status", cmd: "What is the current pipeline status?", icon: <GitBranch className="w-3 h-3" /> },
  { label: "Run SEO Audit", cmd: "Run a full SEO audit", icon: <Search className="w-3 h-3" /> },
  { label: "Scan Brand Mentions", cmd: "Scan for brand mentions", icon: <Shield className="w-3 h-3" /> },
  { label: "Predictive Analysis", cmd: "Run predictive analysis and tell me what signals you see", icon: <TrendingUp className="w-3 h-3" /> },
  { label: "Pending Decisions", cmd: "Show me all pending decisions that need my approval", icon: <AlertCircle className="w-3 h-3" /> },
  { label: "Strategy Summary", cmd: "Summarize our current marketing strategy", icon: <BarChart3 className="w-3 h-3" /> },
  { label: "Behavior Analysis", cmd: "Run UX behavior analysis", icon: <Activity className="w-3 h-3" /> },
  { label: "Generate FAQs", cmd: "Generate FAQ suggestions from customer issues", icon: <Users className="w-3 h-3" /> },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: { type: string };
  actionResult?: Record<string, unknown>;
  timestamp: Date;
}

function ActionBadge({ action }: { action?: { type: string } }) {
  if (!action || action.type === "none") return null;
  const labels: Record<string, { label: string; color: string }> = {
    run_pipeline_stage: { label: "Pipeline Triggered", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
    run_deliberation: { label: "Deliberation Started", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
    run_seo_audit: { label: "SEO Audit Run", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    run_predictive_analysis: { label: "Predictive Analysis", color: "bg-green-500/20 text-green-300 border-green-500/30" },
    scan_brand_mentions: { label: "Brand Scan", color: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
    generate_faq_suggestions: { label: "FAQs Generated", color: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
    run_behavior_analysis: { label: "Behavior Analysis", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
    approve_decision: { label: "Decision Approved", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    reject_decision: { label: "Decision Rejected", color: "bg-red-500/20 text-red-300 border-red-500/30" },
    get_status: { label: "Status Checked", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
  };
  const info = labels[action.type];
  if (!info) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", info.color)}>
      <Zap className="w-3 h-3" /> {info.label}
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3 max-w-4xl", isUser ? "ml-auto flex-row-reverse" : "")}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-indigo-600" : "bg-gradient-to-br from-violet-600 to-indigo-600"
      )}>
        {isUser ? <span className="text-xs font-bold text-white">You</span> : <Brain className="w-4 h-4 text-white" />}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col gap-1 max-w-[85%]", isUser ? "items-end" : "items-start")}>
        {msg.action && msg.action.type !== "none" && (
          <ActionBadge action={msg.action} />
        )}
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-indigo-600 text-white rounded-tr-none"
            : "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none"
        )}>
          {msg.content}
        </div>
        <span className="text-xs text-slate-600">
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const company = currentCompany;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  // Load history on mount
  const { data: history } = trpc.commandCenter.getHistory.useQuery(
    { companyId: companyId ?? 0, limit: 50 },
    { enabled: !!companyId }
  );

  useEffect(() => {
    if (history && messages.length === 0) {
      setMessages(history.map((m: any) => ({
        role: m.role,
        content: m.content,
        action: (m.metadata as any)?.action,
        actionResult: (m.metadata as any)?.actionResult,
        timestamp: new Date(m.createdAt),
      })));
    }
  }, [history]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = trpc.commandCenter.sendMessage.useMutation();

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !companyId || sending) return;
    setInput("");
    setSending(true);

    const userMsg: Message = { role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const recent = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const result = await sendMutation.mutateAsync({
        companyId,
        message: msg,
        history: recent,
      });

      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.reply,
        action: result.action as any,
        actionResult: result.actionResult,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
          <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select a company to open the Command Center</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-white text-sm">Command Center</h1>
          <p className="text-xs text-slate-400">{company?.name} — Full system control</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-slate-400">Online</span>
        </div>
      </div>

      {/* Quick commands */}
      <div className="border-b border-slate-800 bg-slate-900/30 px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
        {QUICK_COMMANDS.map(qc => (
          <button
            key={qc.cmd}
            onClick={() => send(qc.cmd)}
            disabled={sending}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-all disabled:opacity-50"
          >
            {qc.icon}
            {qc.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef as any}>
        <div className="flex flex-col gap-4 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
                <Brain className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Marketing Brain OS — Control Interface</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                This is your direct control interface. Ask about strategy, trigger pipeline stages, review decisions, run analyses, or discuss any aspect of your marketing project.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["What's the pipeline status?", "Explain the strategy", "What decisions are pending?"].map(s => (
                  <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-slate-800 bg-slate-900/50 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a command or question... (Enter to send, Shift+Enter for new line)"
              className="min-h-[44px] max-h-32 resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-xl pr-3 py-3 text-sm focus:border-violet-500 focus:ring-violet-500/20"
              rows={1}
              disabled={sending}
            />
          </div>
          <Button
            onClick={() => send()}
            disabled={!input.trim() || sending}
            size="icon"
            className="h-11 w-11 rounded-xl bg-violet-600 hover:bg-violet-500 flex-shrink-0 shadow-lg shadow-violet-500/20"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">
          Sensitive actions (approvals, pipeline changes) require explicit confirmation
        </p>
      </div>
    </div>
  );
}
