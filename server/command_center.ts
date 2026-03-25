/**
 * Command Center — Intelligent Control Interface
 * The "brain interface" for the entire system.
 * Context-aware: knows active company, pipeline state, all decisions, strategy.
 * Can trigger any backend action via interpreted commands.
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  chatMessages, companies, deliberationSessions, decisions, masterStrategy,
  funnels, contentCalendar, campaignBuilds, personas, competitorProfiles,
  projectPipeline, auditLogs, systemRules,
} from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { buildCompanyContext } from "./knowledge";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ─── Full system state snapshot for context ───────────────────────────────────
export async function buildSystemContext(companyId: number): Promise<string> {
  const db = await D();

  const [
    company, pipeline, strategy, recentDecisions, recentDeliberations,
    funnelList, contentList, campaignList, personaList, competitors,
    recentAudit, activeRules,
  ] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
    db.select().from(projectPipeline).where(eq(projectPipeline.companyId, companyId)).limit(1),
    db.select().from(masterStrategy).where(eq(masterStrategy.companyId, companyId)).limit(1),
    db.select().from(decisions).where(and(eq(decisions.companyId, companyId))).orderBy(desc(decisions.createdAt)).limit(5),
    db.select().from(deliberationSessions).where(eq(deliberationSessions.companyId, companyId)).orderBy(desc(deliberationSessions.createdAt)).limit(3),
    db.select().from(funnels).where(eq(funnels.companyId, companyId)),
    db.select().from(contentCalendar).where(eq(contentCalendar.companyId, companyId)).limit(20),
    db.select().from(campaignBuilds).where(eq(campaignBuilds.companyId, companyId)),
    db.select().from(personas).where(eq(personas.companyId, companyId)),
    db.select().from(competitorProfiles).where(eq(competitorProfiles.companyId, companyId)),
    db.select().from(auditLogs).where(eq(auditLogs.companyId, companyId)).orderBy(desc(auditLogs.createdAt)).limit(10),
    db.select().from(systemRules).where(and(eq(systemRules.companyId, companyId), eq(systemRules.isActive, true))).limit(10),
  ]);

  const co = company[0];
  const pp = pipeline[0];
  const strat = strategy[0];

  return JSON.stringify({
    company: {
      id: co?.id,
      name: co?.name,
      industry: co?.industry,
      website: co?.website,
    },
    pipelineState: {
      currentStage: pp?.currentStage ?? "not_started",
      completedStages: pp?.completedStages ?? [],
    },
    strategy: strat ? {
      status: strat.status,
      positioning: strat.positioning,
      toneOfVoice: strat.toneOfVoice,
      approvedAt: strat.approvedAt,
      kpis: strat.kpis,
    } : null,
    recentDecisions: recentDecisions.map(d => ({
      id: d.id,
      type: d.decisionType,
      recommendation: d.recommendation?.substring(0, 100),
      status: d.status,
      urgency: d.urgency,
    })),
    recentDeliberations: recentDeliberations.map(d => ({
      id: d.id,
      topic: d.topic,
      consensusReached: d.consensusReached,
      status: d.status,
    })),
    funnels: { total: funnelList.length, approved: funnelList.filter(f => f.status === "approved").length },
    content: { total: contentList.length, approved: contentList.filter(c => c.copyStatus === "approved").length },
    campaigns: { total: campaignList.length, launched: campaignList.filter(c => c.status === "launched").length },
    personas: personaList.length,
    competitors: competitors.length,
    recentActions: recentAudit.map(a => `${a.action}: ${a.summary}`).slice(0, 5),
    activeRules: activeRules.map(r => r.ruleText ?? "").slice(0, 5),
  });
}

// ─── Message persistence ───────────────────────────────────────────────────────
export async function saveCommandMessage(companyId: number, role: "user" | "assistant", content: string, metadata?: Record<string, unknown>) {
  const db = await D();
  await db.insert(chatMessages).values({
    companyId,
    role,
    content,
    agentRole: "command_center",
    metadata: metadata ?? {},
  } as any);
}

export async function getCommandHistory(companyId: number, limit = 50) {
  const db = await D();
  const rows = await db.select().from(chatMessages)
    .where(and(eq(chatMessages.companyId, companyId), eq(chatMessages.agentRole, "command_center")))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse(); // Chronological order
}

// ─── Command Interpreter ───────────────────────────────────────────────────────
type CommandAction =
  | { type: "run_pipeline_stage"; stage: string }
  | { type: "run_deliberation"; topic: string; topicType: string }
  | { type: "approve_decision"; decisionId: number }
  | { type: "reject_decision"; decisionId: number }
  | { type: "update_strategy_section"; section: string; value: string }
  | { type: "run_seo_audit" }
  | { type: "run_predictive_analysis" }
  | { type: "scan_brand_mentions" }
  | { type: "generate_faq_suggestions" }
  | { type: "run_behavior_analysis" }
  | { type: "explain_decision"; decisionId: number }
  | { type: "get_status" }
  | { type: "none" };

async function interpretCommand(message: string, systemContext: string): Promise<CommandAction> {
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a command interpreter for an AI Marketing OS. Parse the user's natural language message and determine what action they want to trigger on the system.

System state: ${systemContext}

Return a JSON action object. Available actions:
- {"type": "run_pipeline_stage", "stage": "business_understanding|competitor_discovery|audience_persona|strategy|funnels|content|assets|copy|campaigns"}
- {"type": "run_deliberation", "topic": "string", "topicType": "strategy|campaign|funnel|content|budget|channel|creative|persona|seo|general"}
- {"type": "approve_decision", "decisionId": number}
- {"type": "reject_decision", "decisionId": number}
- {"type": "run_seo_audit"}
- {"type": "run_predictive_analysis"}
- {"type": "scan_brand_mentions"}
- {"type": "generate_faq_suggestions"}
- {"type": "run_behavior_analysis"}
- {"type": "explain_decision", "decisionId": number}
- {"type": "get_status"}
- {"type": "none"}

If the message is just a question or conversation, return {"type": "none"}.`,
      },
      { role: "user", content: message },
    ],
    response_format: { type: "json_object" },
  });

  const raw = result.choices[0]?.message?.content;
  try {
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as CommandAction;
  } catch {
    return { type: "none" };
  }
}

// ─── Main Chat Handler ─────────────────────────────────────────────────────────
export async function processCommandMessage(
  companyId: number,
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  actorName: string
): Promise<{
  reply: string;
  action: CommandAction;
  actionResult?: Record<string, unknown>;
}> {
  // Build fresh system context
  const systemContext = await buildSystemContext(companyId);
  const companyCtx = await buildCompanyContext(companyId);

  // Interpret what action the user wants
  const action = await interpretCommand(userMessage, systemContext);

  // Execute the action
  let actionResult: Record<string, unknown> | undefined;
  if (action.type !== "none" && action.type !== "explain_decision" && action.type !== "get_status") {
    actionResult = await executeAction(companyId, action, actorName);
  }

  // Build the AI reply with full context
  const systemPrompt = `You are the Marketing Brain OS Control Interface for ${JSON.parse(systemContext).company?.name ?? "this company"}.

You are NOT a general chatbot. You are the intelligent control layer for a complete marketing system.

Current System State:
${systemContext}

Full Company Context:
${companyCtx}

Your capabilities:
- Explain any past decision and its reasoning
- Discuss strategy changes
- Trigger pipeline stages (with confirmation)
- Run deliberations
- Approve/reject decisions
- Run analyses (SEO, predictive, brand, behavior)
- Show status of any part of the pipeline
- Discuss and suggest improvements

Rules:
- Always be specific and reference real data from the system context
- When you trigger an action, confirm what you did and show the result
- For sensitive actions (approvals, rejections, pipeline changes), confirm with the user first
- Speak in the same language as the user (Arabic or English)
- Be concise but complete`;

  const historyForLLM = conversationHistory.slice(-8).map(h => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  let userContent = userMessage;
  if (actionResult) {
    userContent += `\n\n[System: Action "${action.type}" was executed. Result: ${JSON.stringify(actionResult)}]`;
  }

  const replyResult = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      ...historyForLLM,
      { role: "user", content: userContent },
    ],
  });

  const rawReply = replyResult.choices[0]?.message?.content;
  const reply = (typeof rawReply === "string" ? rawReply : JSON.stringify(rawReply)) ?? "I processed your request.";

  return { reply, action, actionResult };
}

// ─── Action Executor ───────────────────────────────────────────────────────────
async function executeAction(
  companyId: number,
  action: CommandAction,
  actorName: string
): Promise<Record<string, unknown>> {
  const db = await D();

  switch (action.type) {
    case "run_pipeline_stage": {
      // Import lazily to avoid circular deps
      const { runBusinessUnderstanding, runCompetitorDiscovery, runPersonaGeneration, runStrategyGeneration } = await import("./pipeline");
      const { runFunnelBuild, runContentPlanning, runCopyGeneration, runCampaignBuild, runAssetMappingPipeline } = await import("./execution_pipeline");
      const { createAuditLog } = await import("./db");

      switch (action.stage) {
        case "business_understanding": {
          const r = await runBusinessUnderstanding(companyId);
          await createAuditLog({ companyId, actor: actorName, action: "business_understanding_run", entityType: "company", entityId: companyId, summary: "Business Understanding run via Chat Control" });
          return { stage: "business_understanding", done: true };
        }
        case "competitor_discovery": {
          const r = await runCompetitorDiscovery(companyId);
          await createAuditLog({ companyId, actor: actorName, action: "competitor_discovery_run", entityType: "company", entityId: companyId, summary: `${r.length} competitors discovered via Chat Control` });
          return { stage: "competitor_discovery", count: r.length };
        }
        case "audience_persona": {
          const r = await runPersonaGeneration(companyId);
          await createAuditLog({ companyId, actor: actorName, action: "personas_generated", entityType: "company", entityId: companyId, summary: `${r.length} personas generated via Chat Control` });
          return { stage: "audience_persona", count: r.length };
        }
        case "strategy": {
          const r = await runStrategyGeneration(companyId);
          await createAuditLog({ companyId, actor: actorName, action: "strategy_generated", entityType: "company", entityId: companyId, summary: "Strategy generated via Chat Control" });
          return { stage: "strategy", done: true };
        }
        case "funnels": {
          const r = await runFunnelBuild(companyId);
          return { stage: "funnels", count: r.length };
        }
        case "content": {
          const r = await runContentPlanning(companyId, 1);
          return { stage: "content", count: r.length };
        }
        case "assets": {
          const r = await runAssetMappingPipeline(companyId);
          return { stage: "assets", ...r };
        }
        case "copy": {
          const r = await runCopyGeneration(companyId);
          return { stage: "copy", ...r };
        }
        case "campaigns": {
          const r = await runCampaignBuild(companyId);
          return { stage: "campaigns", count: r.length };
        }
        default:
          return { error: `Unknown stage: ${action.stage}` };
      }
    }

    case "run_deliberation": {
      const { runDeliberation } = await import("./deliberation_engine");
      const r = await runDeliberation(companyId, action.topic, action.topic, action.topicType as any);
      return { sessionId: r.sessionId, consensusReached: r.consensusReached, confidence: r.confidenceScore };
    }

    case "run_seo_audit": {
      const { runSeoAudit } = await import("./seo_engine");
      const r = await runSeoAudit(companyId, "full");
      return { score: r?.score, issues: r?.issues?.length };
    }

    case "run_predictive_analysis": {
      const { runPredictiveAnalysis } = await import("./predictive_engine");
      return await runPredictiveAnalysis(companyId) as any;
    }

    case "scan_brand_mentions": {
      const { scanBrandMentions } = await import("./brand_guardian");
      return await scanBrandMentions(companyId) as any;
    }

    case "generate_faq_suggestions": {
      const { generateFaqSuggestions } = await import("./customer_intelligence");
      const faqs = await generateFaqSuggestions(companyId);
      return { count: faqs.length, faqs };
    }

    case "run_behavior_analysis": {
      const { runBehaviorAnalysis } = await import("./behavior_intelligence");
      return await runBehaviorAnalysis(companyId) as any;
    }

    case "approve_decision": {
      const { approveDecisionItem } = await import("./decision_engine");
      await approveDecisionItem(companyId, action.decisionId);
      return { decisionId: action.decisionId, approved: true };
    }

    case "reject_decision": {
      const { rejectDecisionItem } = await import("./decision_engine");
      await rejectDecisionItem(companyId, action.decisionId);
      return { decisionId: action.decisionId, rejected: true };
    }

    default:
      return {};
  }
}
