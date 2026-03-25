import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/contexts/i18nContext";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Streamdown } from "streamdown";
import {
  Brain, Send, Bot, User, Loader2, Sparkles, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agentRole?: string;
  createdAt: Date;
}

const agentColors: Record<string, string> = {
  CMO: "bg-purple-500/20 text-purple-400",
  "Paid Media Director": "bg-blue-500/20 text-blue-400",
  "Performance Marketing Lead": "bg-green-500/20 text-green-400",
  "Creative Director": "bg-pink-500/20 text-pink-400",
  "Copy Chief": "bg-orange-500/20 text-orange-400",
  "Content Strategist": "bg-teal-500/20 text-teal-400",
  "Funnel Architect": "bg-yellow-500/20 text-yellow-400",
  "CRM Expert": "bg-cyan-500/20 text-cyan-400",
  "SEO Strategist": "bg-lime-500/20 text-lime-400",
  "Data Analyst": "bg-indigo-500/20 text-indigo-400",
  "Competitor Analyst": "bg-red-500/20 text-red-400",
  "Media Buyer": "bg-violet-500/20 text-violet-400",
  "QA Critic": "bg-slate-500/20 text-slate-400",
  Orchestrator: "bg-amber-500/20 text-amber-400",
};

const suggestedPrompts = [
  "Create a comprehensive Q2 marketing strategy for our brand",
  "Analyze our competitive landscape and identify opportunities",
  "Optimize our current ad spend allocation across channels",
  "Build a 30-day content calendar with SEO focus",
  "Develop a customer retention campaign for existing users",
  "Review our funnel and identify conversion bottlenecks",
];

export default function ChatControl() {
  const { t } = useI18n();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id ?? 0;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: history = [] } = trpc.chat.history.useQuery(
    { companyId }, { enabled: companyId > 0 }
  );

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.content,
          agentRole: data.agentRole ?? undefined,
          createdAt: new Date(),
        },
      ]);
      setIsLoading(false);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Error: ${err.message}`,
          createdAt: new Date(),
        },
      ]);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (history.length > 0 && messages.length === 0) {
      const loaded: Message[] = history
        .filter((m) => m.role !== "system")
        .reverse()
        .map((m) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
          agentRole: m.agentRole ?? undefined,
          createdAt: new Date(m.createdAt),
        }));
      setMessages(loaded);
    }
  }, [history]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text?: string) => {
    const content = text ?? input.trim();
    if (!content || isLoading || !companyId) return;
    setInput("");
    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content, createdAt: new Date() },
    ]);
    sendMessage.mutate({ companyId, message: content });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Select a company to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">{t("nav.chat")}</h1>
            <p className="text-xs text-muted-foreground">13 specialized agents · {currentCompany.name}</p>
          </div>
          <Badge className="ml-auto bg-green-500/20 text-green-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 inline-block" />
            Active
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <div className="text-center">
              <h2 className="font-semibold text-lg mb-2">{t("chat.empty")}</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your 13-agent marketing team is ready. Ask anything about strategy, campaigns, content, or analytics.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {suggestedPrompts.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs text-left justify-start h-auto py-2.5 px-3 border-border hover:border-indigo-500/50 hover:bg-indigo-500/5"
                  onClick={() => handleSend(prompt)}
                >
                  <Sparkles className="w-3 h-3 mr-2 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{prompt}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                  msg.role === "user" ? "bg-indigo-500/20" : "bg-slate-700"
                )}>
                  {msg.role === "user"
                    ? <User className="w-4 h-4 text-indigo-400" />
                    : <Bot className="w-4 h-4 text-slate-300" />
                  }
                </div>
                <div className={cn("max-w-[80%] space-y-1", msg.role === "user" ? "items-end" : "items-start")}>
                  {msg.agentRole && (
                    <Badge className={`text-[10px] ${agentColors[msg.agentRole] ?? "bg-slate-500/20 text-slate-400"}`}>
                      {msg.agentRole}
                    </Badge>
                  )}
                  <div className={cn(
                    "rounded-2xl px-4 py-3 text-sm",
                    msg.role === "user"
                      ? "bg-indigo-500 text-white rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm"
                  )}>
                    {msg.role === "assistant"
                      ? <Streamdown>{msg.content}</Streamdown>
                      : <p>{msg.content}</p>
                    }
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">
                    {msg.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-slate-300" />
                </div>
                <Card className="bg-card border-border">
                  <CardContent className="p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span className="text-sm text-muted-foreground">Agents deliberating...</span>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-4 border-t border-border bg-background/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            className="flex-1 min-h-[48px] max-h-[160px] resize-none bg-card border-border text-sm"
            rows={1}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="bg-indigo-500 hover:bg-indigo-600 self-end h-12 px-4"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
