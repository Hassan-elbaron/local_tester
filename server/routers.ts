import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateChatResponse, AGENTS, generateProposalOptions, generateExecutionPreview } from "./agents";
import { runOrchestratedDeliberation } from "./orchestrator";
import { extractKnowledgeFromFile, saveKnowledgeToMemory, executeExternalResearch, saveResearchToMemory, buildCompanyContext } from "./knowledge";
import {
  getLearnings, getSystemRules, approveRule, rejectRule,
  getCampaignResults, saveCampaignResult,
  extractLearningFromEvent, generateRuleFromLearnings,
  scoreDecisionOption, modelScenarios, discoverPatterns,
  buildIntelligenceContext, updateOwnerPreferences,
} from "./intelligence";
import {
  getFunnels, updateFunnelStatus, deleteFunnel,
  getContentCalendar, updateContentItem, deleteContentItem,
  getCampaignBuilds, updateCampaignStatus, deleteCampaign,
} from "./execution";
import {
  runFunnelBuild, runContentPlanning, runCampaignBuild,
  runAssetMappingPipeline, runCopyGeneration, getExecutionStatus,
  preflightCheck, runFullPipeline,
} from "./execution_pipeline";
import { generateCopyForItem, bulkGenerateCopy, generateAdCopyVariations } from "./copy_engine";
import { detectAssetGaps, getCompanyAssets, getAssetIntakeByCompany } from "./asset_system";
import {
  getPipeline, upsertPipeline, advancePipelineStage,
  getCompetitors, upsertCompetitor, deleteCompetitor,
  getPersonas, upsertPersona, deletePersona,
  getStrategy, saveStrategy,
  runBusinessUnderstanding, runCompetitorDiscovery,
  runPersonaGeneration, runStrategyGeneration,
} from "./pipeline";
import { storagePut } from "./storage";
import { setActiveLlmOverride, invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { llmConfigs, integrations } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  runDeliberation, getDeliberationSession, getCompanyDeliberations,
  approveDeliberation, reviseDeliberation, rejectDeliberation,
  getCompanyDecisions, AGENT_REGISTRY,
} from "./deliberation_engine";
import { runSeoAudit, getSeoAudits, getLatestSeoAudit } from "./seo_engine";
import {
  getMonitoringSnapshots, getLatestSnapshots, createMonitoringSnapshot,
  analyzePerformance, getPerformanceTrend,
} from "./monitoring_service";
import {
  getBrandMentions, getUrgentMentions, addBrandMention,
  scanBrandMentions, analyzeBrandHealth, reviewMention, generateMentionResponse,
} from "./brand_guardian";
import {
  getCustomerIssues, addCustomerIssue, extractCustomerIssuesFromText,
  generateFaqSuggestions, buildObjectionMap, updateIssueStatus,
} from "./customer_intelligence";
import {
  logWebEvent, upsertSession, getWebEvents, getSessions,
  getBehaviorInsights, runBehaviorAnalysis, updateInsightStatus,
} from "./behavior_intelligence";
import {
  getPredictions, getActivePredictions, acknowledgePrediction,
  resolvePrediction, runPredictiveAnalysis, detectContentFatigue,
} from "./predictive_engine";
import {
  getDecisions, getPendingDecisions, approveDecisionItem, rejectDecisionItem,
  deferDecision, generateDecision, generateDecisionFromPredictions, updateDecisionNotes,
} from "./decision_engine";
import {
  getExternalIdeas, addExternalIdea, reviewIdea, markIdeaImplemented,
  getSkills, discoverSkill, approveSkill, rejectSkill, markSkillIntegrated, scanForNewSkills,
} from "./learning_engine";
import {
  processCommandMessage, getCommandHistory, saveCommandMessage,
} from "./command_center";
import { approvalRouter } from "./approval_router";
import { runExecutionWithReceipt, persistExecutionReceipt } from "./execution_receipts";
import { validateExecutionGate } from "./execution_gate";
import { getLatestBrainRun, getBrainRunHistory } from "./replay_service";
import {
  STRATEGY_SECTIONS,
  snapshotStrategy,
  getStrategyVersions,
  getStrategyVersionById,
  compareStrategyVersions,
  editStrategySection,
  rollbackToVersion,
  deliberateOnSection,
} from "./strategy_versioning";
import {
  deliberationSessions, decisions, seoAudits, externalIdeas, skillsRegistry,
  strategyVersions,
} from "../drizzle/schema";
import {
  approveDecision,
  createAuditLog,
  createCompany,
  createDeliberation,
  createNotification,
  createProposal,
  getAllCompanies,
  getAuditLogs,
  getCompanyById,
  getCompanyMemory,
  getDeliberationByProposal,
  getNotifications,
  getPendingApprovals,
  getProposalById,
  getProposalsByCompany,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  rejectDecision,
  requestRevision,
  saveAgentOpinion,
  saveChatMessage,
  getChatHistory,
  updateCompany,
  updateDeliberation,
  updateProposalStatus,
  upsertCompanyMemory,
  createApproval,
  getApprovalsByCompany,
  getAgentOpinionsByDeliberation,
  getApprovalByProposal,
  createProposalOption,
  getProposalOptions,
  createExecutionPreview,
  getExecutionPreviewById,
  createCompanyFile,
  getCompanyFiles,
  updateCompanyFile,
  createExternalResearchRequest,
  getExternalResearchRequests,
  getExternalResearchRequest,
  updateExternalResearchRequest,
} from "./db";

// ─── Companies Router ─────────────────────────────────────────────────────────
const companiesRouter = router({
  list: protectedProcedure.query(async () => {
    return getAllCompanies();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getCompanyById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      nameAr: z.string().optional(),
      industry: z.string().optional(),
      website: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      primaryColor: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const company = await createCompany(input);
      await createAuditLog({
        companyId: company!.id,
        entityType: "company",
        entityId: company!.id,
        action: "create",
        actor: ctx.user?.name ?? "system",
        summary: `Company "${company!.name}" created`,
        summaryAr: `تم إنشاء الشركة "${company!.nameAr ?? company!.name}"`,
      });
      // Seed initial memory
      await upsertCompanyMemory(company!.id, "company_profile", {
        name: company!.name, industry: company!.industry, website: company!.website,
        description: company!.description,
      }, "brand");
      return company;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameAr: z.string().optional(),
      industry: z.string().optional(),
      website: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      primaryColor: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const company = await updateCompany(id, data);
      await createAuditLog({
        companyId: id, entityType: "company", entityId: id,
        action: "update", actor: ctx.user?.name ?? "system",
        summary: `Company "${company!.name}" updated`,
      });
      return company;
    }),
});

// ─── Proposals Router ─────────────────────────────────────────────────────────
const proposalsRouter = router({
  list: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      return getProposalsByCompany(input.companyId);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number(), companyId: z.number() }))
    .query(async ({ input }) => {
      return getProposalById(input.id, input.companyId);
    }),

  create: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      title: z.string().min(1),
      titleAr: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      type: z.enum(["strategy", "campaign", "budget", "content", "seo", "paid_media", "crm", "funnel"]),
      budget: z.number().optional(),
      currency: z.string().optional(),
      timeline: z.string().optional(),
      channels: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const proposal = await createProposal(input);
      await createAuditLog({
        companyId: input.companyId, entityType: "proposal", entityId: proposal!.id,
        action: "create", actor: ctx.user?.name ?? "system",
        summary: `Proposal "${proposal!.title}" created with status: draft`,
        after: { status: "draft", type: input.type },
      });
      await createNotification({
        companyId: input.companyId, type: "proposal_update",
        title: "New Proposal Created",
        titleAr: "تم إنشاء مقترح جديد",
        message: `Proposal "${proposal!.title}" has been created and is ready for deliberation.`,
        messageAr: `تم إنشاء المقترح "${proposal!.titleAr ?? proposal!.title}" وهو جاهز للمداولة.`,
        entityType: "proposal", entityId: proposal!.id,
      });
      return proposal;
    }),

  // Start deliberation - runs all 13 agents
  deliberate: protectedProcedure
    .input(z.object({ proposalId: z.number(), companyId: z.number() }))
    .mutation(async ({ input }) => {
      const proposal = await getProposalById(input.proposalId, input.companyId);
      if (!proposal) throw new Error("Proposal not found");
      const allowedStatuses: string[] = ["draft", "proposed", "needs_revision"];
      if (!allowedStatuses.includes(proposal.status)) {
        throw new Error("Proposal must be in draft, proposed, or needs_revision status");
      }
      await updateProposalStatus(input.proposalId, input.companyId, "under_deliberation");
      const proposalContext = [
        `Title: ${proposal.title}`,
        `Type: ${proposal.type}`,
        `Description: ${proposal.description ?? "N/A"}`,
        `Budget: ${proposal.budget ? `${proposal.currency ?? "USD"} ${proposal.budget.toLocaleString()}` : "Not specified"}`,
        `Timeline: ${proposal.timeline ?? "Not specified"}`,
        `Channels: ${(proposal.channels as string[] ?? []).join(", ") || "Not specified"}`,
      ].join("\n");
      // Run orchestrated deliberation (contextual routing + weighted + traceable)
      const result = await runOrchestratedDeliberation({
        proposalId: input.proposalId,
        companyId: input.companyId,
        proposalType: proposal.type,
        proposalContext,
        budget: proposal.budget ?? undefined,
      });
      // Approval-first: no execution without approval
      const approval = await createApproval({
        proposalId: input.proposalId,
        companyId: input.companyId,
        deliberationId: result.deliberationId,
        recommendation: result.finalRecommendation,
        recommendationAr: result.finalRecommendationAr,
        risks: result.dissentSummary.map((d: any) => d.concern).slice(0, 5),
        consensusScore: result.weightedConsensusScore,
      });
      await updateProposalStatus(input.proposalId, input.companyId, result.escalated ? "needs_revision" : "pending_approval");
      await createAuditLog({
        companyId: input.companyId, entityType: "deliberation", entityId: result.deliberationId,
        action: "complete", actor: "system",
        summary: `Orchestrated deliberation: ${result.selectedAgents.length} agents, weighted consensus ${(result.weightedConsensusScore * 100).toFixed(0)}%. ${result.escalated ? "ESCALATED: " + result.escalationReason : "Awaiting approval."}`,
        after: { consensusScore: result.weightedConsensusScore, escalated: result.escalated, dissents: result.dissentSummary.length },
      });
      await createNotification({
        companyId: input.companyId, type: "approval_request",
        title: result.escalated ? "Escalation Required" : "Approval Required",
        titleAr: result.escalated ? "مطلوب تدخل" : "مطلوب موافقة",
        message: result.escalated
          ? `Deliberation escalated: ${result.escalationReason}`
          : `Deliberation complete for "${proposal.title}". Weighted consensus: ${(result.weightedConsensusScore * 100).toFixed(0)}%. ${result.dissentSummary.length} dissent(s). Your approval required.`,
        messageAr: result.summaryAr,
        entityType: "approval", entityId: approval!.id,
      });
      return {
        deliberationId: result.deliberationId,
        approval,
        escalated: result.escalated,
        decisionTrace: result.decisionTrace,
        brainRun: result.brainRun,
        execution: result.brainRun.execution ?? null,
      };
    }),
  getDeliberation: protectedProcedure
    .input(z.object({ proposalId: z.number(), companyId: z.number() }))
    .query(async ({ input }) => {
      const deliberation = await getDeliberationByProposal(input.proposalId, input.companyId);
      if (!deliberation) return null;
      const opinions = await getAgentOpinionsByDeliberation(deliberation.id);
      return { ...deliberation, opinions };
    }),
  generateOptions: protectedProcedure
    .input(z.object({ proposalId: z.number(), companyId: z.number() }))
    .mutation(async ({ input }) => {
      const proposal = await getProposalById(input.proposalId, input.companyId);
      if (!proposal) throw new Error("Proposal not found");
      const deliberation = await getDeliberationByProposal(input.proposalId, input.companyId);
      const opinions = deliberation ? await getAgentOpinionsByDeliberation(deliberation.id) : [];
      const company = await getCompanyById(input.companyId);
      const companyContext = `Company: ${company?.name} (${company?.industry ?? "Unknown"})\nDescription: ${company?.description ?? "N/A"}`;
      const proposalContext = `Title: ${proposal.title}\nType: ${proposal.type}\nDescription: ${proposal.description ?? "N/A"}\nBudget: ${proposal.budget ?? "N/A"}`;
      const agentOpinions = opinions.map((o) => ({
        agentRole: o.agentRole ?? "",
        agentName: o.agentName ?? "",
        opinion: o.opinion ?? "",
        opinionAr: o.opinionAr ?? "",
        recommendation: o.recommendation ?? "",
        confidence: o.confidence ?? 0.7,
        concerns: (o.concerns as string[]) ?? [],
        suggestions: (o.suggestions as string[]) ?? [],
        votedFor: o.votedFor ?? true,
      }));
      const options = await generateProposalOptions(proposalContext, companyContext, agentOpinions);
      // Save options to DB
      for (const opt of options) {
        await createProposalOption({
          proposalId: input.proposalId,
          companyId: input.companyId,
          optionIndex: opt.optionIndex,
          title: opt.title,
          titleAr: opt.titleAr,
          description: opt.description,
          descriptionAr: opt.descriptionAr,
          scores: opt.scores as any,
          pros: opt.pros,
          cons: opt.cons,
          estimatedBudget: opt.estimatedBudget,
          estimatedTimeline: opt.estimatedTimeline,
          channels: opt.channels,
          isRecommended: opt.isRecommended,
          whyRecommended: opt.whyRecommended,
          whyOthersRejected: opt.whyOthersRejected,
          agentVotes: opt.agentVotes,
        });
      }
      return options;
    }),
  getOptions: protectedProcedure
    .input(z.object({ proposalId: z.number(), companyId: z.number() }))
    .query(async ({ input }) => {
      return getProposalOptions(input.proposalId, input.companyId);
    }),
  generateExecutionPreview: protectedProcedure
    .input(z.object({ proposalId: z.number(), companyId: z.number(), selectedOptionIndex: z.number().default(2) }))
    .mutation(async ({ input }) => {
      const proposal = await getProposalById(input.proposalId, input.companyId);
      if (!proposal) throw new Error("Proposal not found");
      const company = await getCompanyById(input.companyId);
      const companyContext = `Company: ${company?.name} (${company?.industry ?? "Unknown"})\nDescription: ${company?.description ?? "N/A"}`;
      const options = await getProposalOptions(input.proposalId, input.companyId);
      const selectedOption = options.find((o) => o.optionIndex === input.selectedOptionIndex) ?? options[1] ?? options[0];
      if (!selectedOption) throw new Error("No options found. Run generateOptions first.");
      const optionForPreview = {
        optionIndex: selectedOption.optionIndex,
        title: selectedOption.title,
          titleAr: selectedOption.titleAr ?? selectedOption.title,
        description: selectedOption.description,
        descriptionAr: selectedOption.descriptionAr ?? selectedOption.description,
        scores: selectedOption.scores as any,
        pros: (selectedOption.pros as string[]) ?? [],
        cons: (selectedOption.cons as string[]) ?? [],
        estimatedTimeline: selectedOption.estimatedTimeline ?? undefined,
        channels: (selectedOption.channels as string[]) ?? [],
        isRecommended: selectedOption.isRecommended ?? false,
        agentVotes: (selectedOption.agentVotes as any[]) ?? [],
      };
      const preview = await generateExecutionPreview(
        { title: proposal.title, description: proposal.description ?? undefined, type: proposal.type, budget: proposal.budget ?? undefined },
        optionForPreview,
        companyContext
      );
      const saved = await createExecutionPreview({
        proposalId: input.proposalId,
        companyId: input.companyId,
        approvalId: 0,
        campaignStructure: preview.campaignStructure,
        adPreviews: preview.adPreviews,
        executionSteps: preview.executionSteps,
      });
      return { ...preview, id: saved?.id };
    }),
  getExecutionPreview: protectedProcedure
    .input(z.object({ proposalId: z.number(), companyId: z.number() }))
    .query(async ({ input }) => {
      const options = await getProposalOptions(input.proposalId, input.companyId);
      if (options.length === 0) return null;
      const recommended = options.find((o) => o.isRecommended) ?? options[0];
      return getExecutionPreviewById(recommended.id);
    }),
});

// ─── Approvals Router ─────────────────────────────────────────────────────────
const approvalsRouter = router({
  getByProposal: protectedProcedure
    .input(z.object({ proposalId: z.number(), companyId: z.number() }))
    .query(async ({ input }) => {
      return getApprovalByProposal(input.proposalId, input.companyId);
    }),
  pending: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      return getPendingApprovals(input.companyId);
    }),

  list: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      return getApprovalsByCompany(input.companyId);
    }),

  approve: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
      companyId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const approval = await approveDecision(input.approvalId, ctx.user?.name ?? "admin", input.reason);
      if (!approval) throw new Error("Approval not found");

      // Update proposal status to approved
      await updateProposalStatus(approval.proposalId, input.companyId, "approved");

      await createAuditLog({
        companyId: input.companyId, entityType: "approval", entityId: input.approvalId,
        action: "approve", actor: ctx.user?.name ?? "admin",
        summary: `Proposal approved by ${ctx.user?.name ?? "admin"}. Reason: ${input.reason ?? "No reason provided"}`,
        after: { status: "approved", approvedBy: ctx.user?.name },
      });

      const proposal = await getProposalById(approval.proposalId, input.companyId);
      await createNotification({
        companyId: input.companyId, type: "approval_decision",
        title: "Proposal Approved ✓",
        titleAr: "تمت الموافقة على المقترح ✓",
        message: `"${proposal?.title}" has been approved and is ready for execution.`,
        messageAr: `تمت الموافقة على "${proposal?.titleAr ?? proposal?.title}" وهو جاهز للتنفيذ.`,
        entityType: "proposal", entityId: approval.proposalId,
      });

      return approval;
    }),

  reject: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
      companyId: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const approval = await rejectDecision(input.approvalId, ctx.user?.name ?? "admin", input.reason);
      if (!approval) throw new Error("Approval not found");

      await updateProposalStatus(approval.proposalId, input.companyId, "rejected");

      await createAuditLog({
        companyId: input.companyId, entityType: "approval", entityId: input.approvalId,
        action: "reject", actor: ctx.user?.name ?? "admin",
        summary: `Proposal rejected. Reason: ${input.reason}`,
        after: { status: "rejected", rejectionReason: input.reason },
      });

      const proposal = await getProposalById(approval.proposalId, input.companyId);
      await createNotification({
        companyId: input.companyId, type: "approval_decision",
        title: "Proposal Rejected",
        titleAr: "تم رفض المقترح",
        message: `"${proposal?.title}" has been rejected. Reason: ${input.reason}`,
        messageAr: `تم رفض "${proposal?.titleAr ?? proposal?.title}". السبب: ${input.reason}`,
        entityType: "proposal", entityId: approval.proposalId,
      });

      return approval;
    }),

  requestRevision: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
      companyId: z.number(),
      notes: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const approval = await requestRevision(input.approvalId, input.notes);
      if (!approval) throw new Error("Approval not found");

      await updateProposalStatus(approval.proposalId, input.companyId, "revised");

      await createAuditLog({
        companyId: input.companyId, entityType: "approval", entityId: input.approvalId,
        action: "request_revision", actor: ctx.user?.name ?? "admin",
        summary: `Revision requested. Notes: ${input.notes}`,
      });

      return approval;
    }),
});

// ─── Notifications Router ─────────────────────────────────────────────────────
const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ companyId: z.number(), unreadOnly: z.boolean().optional() }))
    .query(async ({ input }) => {
      return getNotifications(input.companyId, input.unreadOnly ?? false);
    }),

  unreadCount: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      return getUnreadNotificationCount(input.companyId);
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number(), companyId: z.number() }))
    .mutation(async ({ input }) => {
      await markNotificationRead(input.id, input.companyId);
      return { success: true };
    }),

  markAllRead: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input }) => {
      await markAllNotificationsRead(input.companyId);
      return { success: true };
    }),
});

// ─── Memory Router ────────────────────────────────────────────────────────────
const memoryRouter = router({
  get: protectedProcedure
    .input(z.object({ companyId: z.number(), category: z.string().optional() }))
    .query(async ({ input }) => {
      return getCompanyMemory(input.companyId, input.category);
    }),

  upsert: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      key: z.string(),
      value: z.unknown(),
      category: z.enum(["strategy", "audience", "competitors", "brand", "performance", "preferences"]),
    }))
    .mutation(async ({ input }) => {
      await upsertCompanyMemory(input.companyId, input.key, input.value, input.category);
      return { success: true };
    }),
});

// ─── Agents Router ────────────────────────────────────────────────────────────
const agentsRouter = router({
  list: publicProcedure.query(() => {
    return AGENTS.map((a) => ({
      role: a.role, name: a.name, nameAr: a.nameAr,
      expertise: a.expertise, color: a.color, icon: a.icon,
    }));
  }),
});

// ─── Audit Router ─────────────────────────────────────────────────────────────
const auditRouter = router({
  list: protectedProcedure
    .input(z.object({ companyId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return getAuditLogs(input.companyId, input.limit ?? 50);
    }),
});

// ─── Chat Router ──────────────────────────────────────────────────────────────
const chatRouter = router({
  history: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      const messages = await getChatHistory(input.companyId, 50);
      return messages.reverse(); // oldest first
    }),

  send: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      message: z.string().min(1),
      language: z.enum(["en", "ar"]).optional(),
    }))
    .mutation(async ({ input }) => {
      // Save user message
      await saveChatMessage({
        companyId: input.companyId, role: "user", content: input.message,
      });

      // Get company context
      const company = await getCompanyById(input.companyId);
      const memory = await getCompanyMemory(input.companyId);
      const companyContext = `Company: ${company?.name} (${company?.industry ?? "Unknown"})
Description: ${company?.description ?? "N/A"}
Memory: ${memory.slice(0, 3).map((m) => `${m.key}: ${JSON.stringify(m.value)}`).join(", ")}`;

      // Get recent chat history
      const history = await getChatHistory(input.companyId, 10);
      const chatHistory = history.reverse().map((m) => ({ role: m.role, content: m.content }));

      // Generate response
      const response = await generateChatResponse(
        input.message, companyContext, chatHistory, input.language ?? "en"
      );

      // Save assistant response
      await saveChatMessage({
        companyId: input.companyId, role: "assistant",
        content: response.content, agentRole: response.agentRole,
      });

      return { content: response.content, agentRole: response.agentRole };
    }),
});

// ─── Files Router ────────────────────────────────────────────────────────────
const filesRouter = router({
  list: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getCompanyFiles(input.companyId)),

  upload: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      fileName: z.string(),
      fileBase64: z.string(),
      mimeType: z.string(),
      fileSize: z.number(),
      category: z.enum(["logo", "brand_guidelines", "creative", "report", "brief", "audience_doc", "competitor_analysis", "pricing", "sales_doc", "other"]).default("other"),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.fileBase64, "base64");
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const fileKey = `company-${input.companyId}/files/${randomSuffix}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // Save file record
      const file = await createCompanyFile({
        companyId: input.companyId,
        fileName: input.fileName,
        fileKey,
        fileUrl: url,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        category: input.category,
        description: input.description,
      });

      // Audit log
      await createAuditLog({
        companyId: input.companyId,
        actor: ctx.user?.name ?? "user",
        action: "file_uploaded",
        entityType: "company_file",
        entityId: file?.id ?? 0,
        summary: `File "${input.fileName}" uploaded (${input.category})`,
      });

      return file;
    }),

  extract: protectedProcedure
    .input(z.object({ fileId: z.number(), companyId: z.number() }))
    .mutation(async ({ input }) => {
      const files = await getCompanyFiles(input.companyId);
      const file = files.find(f => f.id === input.fileId);
      if (!file) throw new Error("File not found");

      // Get company name
      const company = await getCompanyById(input.companyId);
      if (!company) throw new Error("Company not found");

      // Mark as processing
      await updateCompanyFile(input.fileId, { extractionStatus: "processing" });

      try {
        const knowledge = await extractKnowledgeFromFile({
          fileName: file.fileName,
          fileCategory: file.category,
          fileUrl: file.fileUrl,
          companyName: company.name,
          mimeType: file.mimeType,
        });

        const memoryIds = await saveKnowledgeToMemory(input.companyId, knowledge, file.fileName);

        await updateCompanyFile(input.fileId, {
          extractionStatus: "complete",
          extractedKnowledge: knowledge as any,
          knowledgeMemoryIds: memoryIds as any,
        });

        return { success: true, knowledge, memoryCount: memoryIds.length };
      } catch (err) {
        await updateCompanyFile(input.fileId, { extractionStatus: "failed" });
        throw err;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ fileId: z.number(), companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const files = await getCompanyFiles(input.companyId);
      const file = files.find(f => f.id === input.fileId);
      if (!file) throw new Error("File not found");
      await updateCompanyFile(input.fileId, { extractionStatus: "failed" }); // soft delete marker
      await createAuditLog({
        companyId: input.companyId,
        actor: ctx.user?.name ?? "user",
        action: "file_deleted",
        entityType: "company_file",
        entityId: input.fileId,
        summary: `File "${file.fileName}" removed`,
      });
      return { success: true };
    }),
});

// ─── External Research Router ─────────────────────────────────────────────────
const researchRouter = router({
  list: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getExternalResearchRequests(input.companyId)),

  request: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      searchTargets: z.array(z.string()),
      dataSources: z.array(z.string()),
      researchGoal: z.string(),
      researchGoalAr: z.string().optional(),
      frequency: z.enum(["one_time", "weekly", "monthly"]).default("one_time"),
      estimatedDataSize: z.string().optional(),
      privacyNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const req = await createExternalResearchRequest({
        ...input,
        requestedBy: ctx.user?.name ?? "user",
      });
      await createAuditLog({
        companyId: input.companyId,
        actor: ctx.user?.name ?? "user",
        action: "research_requested",
        entityType: "external_research",
        entityId: req.id,
        summary: `External research requested: ${input.researchGoal}`,
      });
      return req;
    }),

  approve: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const req = await getExternalResearchRequest(input.requestId);
      if (!req) throw new Error("Research request not found");
      if (req.status !== "pending_approval") throw new Error("Request is not pending approval");

      // Mark approved
      await updateExternalResearchRequest(input.requestId, {
        status: "approved",
        approvedBy: ctx.user?.name ?? "user",
        approvedAt: new Date(),
      });

      await createAuditLog({
        companyId: req.companyId,
        actor: ctx.user?.name ?? "user",
        action: "research_approved",
        entityType: "external_research",
        entityId: req.id,
        summary: `External research approved by ${ctx.user?.name ?? "user"}`,
      });

      return { success: true, message: "Research approved. Use 'execute' to run it." };
    }),

  reject: protectedProcedure
    .input(z.object({ requestId: z.number(), reason: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const req = await getExternalResearchRequest(input.requestId);
      if (!req) throw new Error("Research request not found");

      await updateExternalResearchRequest(input.requestId, {
        status: "rejected",
        rejectedBy: ctx.user?.name ?? "user",
        rejectionReason: input.reason,
      });

      await createAuditLog({
        companyId: req.companyId,
        actor: ctx.user?.name ?? "user",
        action: "research_rejected",
        entityType: "external_research",
        entityId: req.id,
        summary: `External research rejected: ${input.reason}`,
      });

      return { success: true };
    }),

  execute: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const req = await getExternalResearchRequest(input.requestId);
      if (!req) throw new Error("Research request not found");
      if (req.status !== "approved") throw new Error("Research must be approved before execution");

      const company = await getCompanyById(req.companyId);
      if (!company) throw new Error("Company not found");

      // Mark as running
      await updateExternalResearchRequest(input.requestId, { status: "running" });

      try {
        const result = await executeExternalResearch({
          companyName: company.name,
          website: company.website ?? undefined,
          searchTargets: req.searchTargets as string[],
          dataSources: req.dataSources as string[],
          researchGoal: req.researchGoal,
        });

        const memoryIds = await saveResearchToMemory(req.companyId, result);

        await updateExternalResearchRequest(input.requestId, {
          status: "complete",
          result: result as any,
          memoryKeysCreated: memoryIds as any,
        });

        await createAuditLog({
          companyId: req.companyId,
          actor: "system",
          action: "research_completed",
          entityType: "external_research",
          entityId: req.id,
          summary: `External research completed. ${memoryIds.length} memory entries created.`,
        });

        // Notify owner
        await createNotification({
          companyId: req.companyId,
          type: "system",
          title: "External Research Complete",
          message: `Research on "${company.name}" completed. ${memoryIds.length} knowledge entries saved to company memory.`,
          actionUrl: `/companies/${req.companyId}`,
        });

        return { success: true, result, memoryCount: memoryIds.length };
      } catch (err) {
        await updateExternalResearchRequest(input.requestId, { status: "failed" });
        throw err;
      }
    }),
});

// ─── Main App Router ──────────────────────────────────────────────────────────
// ─── Intelligence Router ─────────────────────────────────────────────────────
const intelligenceRouter = router({
  // Learnings
  getLearnings: protectedProcedure
    .input(z.object({ companyId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => getLearnings(input.companyId, input.limit)),

  // System Rules (require human approval before activation)
  getRules: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => getSystemRules(input.companyId)),

  approveRule: protectedProcedure
    .input(z.object({ ruleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await approveRule(input.ruleId, ctx.user.name ?? ctx.user.openId);
      return { success: true };
    }),

  rejectRule: protectedProcedure
    .input(z.object({ ruleId: z.number() }))
    .mutation(async ({ input }) => {
      await rejectRule(input.ruleId);
      return { success: true };
    }),

  generateRule: protectedProcedure
    .input(z.object({ companyId: z.number(), learningIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const ruleId = await generateRuleFromLearnings(input);
      return { ruleId };
    }),

  // Campaign Results (Closed-Loop)
  getCampaignResults: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => getCampaignResults(input.companyId)),

  saveCampaignResult: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      proposalId: z.number(),
      actualRoas: z.number().optional(),
      actualCpa: z.number().optional(),
      actualReach: z.number().optional(),
      actualImpressions: z.number().optional(),
      actualClicks: z.number().optional(),
      actualConversions: z.number().optional(),
      actualSpend: z.number().optional(),
      actualRevenue: z.number().optional(),
      predictedRoas: z.number().optional(),
      predictedCpa: z.number().optional(),
      performanceVsPrediction: z.enum(["exceeded","met","below","far_below"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const resultId = await saveCampaignResult({ ...input, enteredBy: ctx.user.name ?? ctx.user.openId });
      // Auto-extract learning from result
      if (resultId) {
        await extractLearningFromEvent({
          companyId: input.companyId,
          eventType: "campaign_result",
          entityId: input.proposalId,
          entityType: "proposal",
          context: JSON.stringify(input),
        });
      }
      return { resultId };
    }),

  // Decision Scoring
  scoreOption: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      proposalTitle: z.string(),
      proposalType: z.string(),
      optionTitle: z.string(),
      optionDescription: z.string(),
      budget: z.number(),
    }))
    .mutation(async ({ input }) => {
      const companyContext = await buildIntelligenceContext(input.companyId);
      const activeRules = await getSystemRules(input.companyId);
      const rulesText = activeRules.filter((r: any) => r.isActive).map((r: any) => r.ruleText).join("\n");
      return scoreDecisionOption({ ...input, companyContext, activeRules: rulesText });
    }),

  // Scenario Modeling
  modelScenarios: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      proposalTitle: z.string(),
      baseBudget: z.number(),
      baseRoas: z.number(),
      baseCpa: z.number(),
    }))
    .mutation(async ({ input }) => {
      const companyContext = await buildIntelligenceContext(input.companyId);
      return modelScenarios({ ...input, companyContext });
    }),

  // Pattern Discovery
  discoverPatterns: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input }) => {
      const recentLearnings = await getLearnings(input.companyId, 30);
      return discoverPatterns({ companyId: input.companyId, recentLearnings: recentLearnings as any[] });
    }),

  // Intelligence Context
  getContext: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => buildIntelligenceContext(input.companyId)),
});

// ─── Pipeline Router ──────────────────────────────────────────────────────────
const pipelineRouter = router({
  // Pipeline state
  get: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getPipeline(input.companyId)),

  advance: protectedProcedure
    .input(z.object({ companyId: z.number(), stage: z.string() }))
    .mutation(({ input }) => advancePipelineStage(input.companyId, input.stage)),

  // Business Understanding
  runBusinessUnderstanding: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const report = await runBusinessUnderstanding(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "business_understanding_run", entityType: "company", entityId: input.companyId,
        summary: "Business Understanding analysis completed",
      });
      await advancePipelineStage(input.companyId, "business_understanding");
      return report;
    }),

  // Competitor Discovery
  discoverCompetitors: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const discovered = await runCompetitorDiscovery(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "competitor_discovery_run", entityType: "company", entityId: input.companyId,
        summary: `Competitor discovery: ${discovered.length} competitors found`,
      });
      await advancePipelineStage(input.companyId, "competitor_discovery");
      return discovered;
    }),

  getCompetitors: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getCompetitors(input.companyId)),

  updateCompetitor: protectedProcedure
    .input(z.object({
      companyId: z.number(), id: z.number().optional(),
      name: z.string(), website: z.string().optional(),
      status: z.enum(["discovered", "confirmed", "rejected"]).optional(),
      discoveredBy: z.enum(["system", "user"]).optional(),
    }))
    .mutation(({ input }) => upsertCompetitor(input.companyId, input)),

  deleteCompetitor: protectedProcedure
    .input(z.object({ companyId: z.number(), competitorId: z.number() }))
    .mutation(({ input }) => deleteCompetitor(input.companyId, input.competitorId)),

  confirmCompetitors: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input }) => {
      await advancePipelineStage(input.companyId, "competitor_review");
      return { success: true };
    }),

  // Personas
  generatePersonas: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const generated = await runPersonaGeneration(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "personas_generated", entityType: "company", entityId: input.companyId,
        summary: `${generated.length} personas generated`,
      });
      await advancePipelineStage(input.companyId, "audience_persona");
      return generated;
    }),

  getPersonas: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getPersonas(input.companyId)),

  updatePersona: protectedProcedure
    .input(z.object({
      companyId: z.number(), id: z.number().optional(),
      name: z.string(), description: z.string().optional(),
      status: z.enum(["draft", "approved"]).optional(),
    }))
    .mutation(({ input }) => upsertPersona(input.companyId, input)),

  deletePersona: protectedProcedure
    .input(z.object({ companyId: z.number(), personaId: z.number() }))
    .mutation(({ input }) => deletePersona(input.companyId, input.personaId)),

  // Strategy
  generateStrategy: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const strategy = await runStrategyGeneration(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "strategy_generated", entityType: "company", entityId: input.companyId,
        summary: "Master Marketing Strategy generated",
      });
      await advancePipelineStage(input.companyId, "strategy_generation");
      await createNotification({
        companyId: input.companyId, type: "approval_request",
        title: "Strategy Ready for Review",
        titleAr: "الاستراتيجية جاهزة للمراجعة",
        message: "Master Marketing Strategy has been generated and is awaiting your review and approval.",
        messageAr: "تم توليد الاستراتيجية التسويقية الشاملة وهي تنتظر مراجعتك واعتمادك.",
      });
      return strategy;
    }),

  getStrategy: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getStrategy(input.companyId)),

  approveStrategy: protectedProcedure
    .input(z.object({ companyId: z.number(), strategyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await saveStrategy(input.companyId, {
        status: "approved", approvedBy: ctx.user.name ?? "user", approvedAt: new Date(),
      } as any);
      await advancePipelineStage(input.companyId, "strategy_approved");
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "user",
        action: "strategy_approved", entityType: "company", entityId: input.companyId,
        summary: `Master Strategy approved by ${ctx.user.name ?? "user"}`,
      });
      return { success: true };
    }),

  // ── Human Review & Versioning ─────────────────────────────────────────────

  // Edit a strategy section (auto-snapshots before writing)
  editStrategySection: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      section: z.string(),
      value: z.unknown(),
      changeReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await editStrategySection(
        input.companyId,
        input.section as any,
        input.value,
        ctx.user.name ?? ctx.user.openId,
        input.changeReason,
      );
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "user",
        action: "strategy_section_edited", entityType: "company", entityId: input.companyId,
        summary: `Strategy section "${input.section}" edited — snapshot v${result.snapshotVersionId} saved`,
      });
      return result;
    }),

  // Legacy alias (kept for backward compatibility)
  updateStrategySection: protectedProcedure
    .input(z.object({
      companyId: z.number(), strategyId: z.number(),
      section: z.string(), value: z.unknown(),
      revisionNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return editStrategySection(
        input.companyId,
        input.section as any,
        input.value,
        ctx.user.name ?? ctx.user.openId,
        input.revisionNote,
      );
    }),

  // Get all saved versions for a strategy
  getVersionHistory: protectedProcedure
    .input(z.object({ companyId: z.number(), strategyId: z.number() }))
    .query(({ input }) => getStrategyVersions(input.companyId, input.strategyId)),

  // Get the full snapshot data of a specific version
  getVersion: protectedProcedure
    .input(z.object({ companyId: z.number(), versionId: z.number() }))
    .query(({ input }) => getStrategyVersionById(input.versionId, input.companyId)),

  // Compare two saved versions
  compareVersions: protectedProcedure
    .input(z.object({ companyId: z.number(), versionIdA: z.number(), versionIdB: z.number() }))
    .query(({ input }) => compareStrategyVersions(input.companyId, input.versionIdA, input.versionIdB)),

  // Rollback to a previous version
  rollbackToVersion: protectedProcedure
    .input(z.object({ companyId: z.number(), versionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await rollbackToVersion(input.companyId, input.versionId, ctx.user.name ?? ctx.user.openId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "user",
        action: "strategy_rolled_back", entityType: "company", entityId: input.companyId,
        summary: `Strategy rolled back to version ${result.restoredVersion} by ${ctx.user.name}`,
      });
      await createNotification({
        companyId: input.companyId, type: "system",
        title: "Strategy Rolled Back",
        message: `Strategy restored to version ${result.restoredVersion}. Review required before re-approval.`,
      });
      return result;
    }),

  // Re-deliberate a specific section using relevant agents
  deliberateSection: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      section: z.string(),
      userFeedback: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const sectionMeta = STRATEGY_SECTIONS.find(s => s.key === input.section);
      const label = sectionMeta?.label ?? input.section;
      const result = await deliberateOnSection(
        input.companyId,
        input.section as any,
        label,
        input.userFeedback,
      );
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "section_deliberation_run", entityType: "company", entityId: input.companyId,
        summary: `Section re-deliberation: "${label}" — ${(result.confidenceScore * 100).toFixed(0)}% confidence`,
      });
      return result;
    }),

  // Get section metadata (for UI)
  getStrategySections: publicProcedure.query(() => STRATEGY_SECTIONS),
});

// ─── Execution Router ─────────────────────────────────────────────────────────
const executionRouter = router({
  // ── Status ────────────────────────────────────────────────────────────────
  getExecutionStatus: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getExecutionStatus(input.companyId)),

  // ── Funnels ───────────────────────────────────────────────────────────────
  getFunnels: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getFunnels(input.companyId)),

  buildFunnels: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await runFunnelBuild(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "funnels_built", entityType: "company", entityId: input.companyId,
        summary: `${result.length} funnels built from strategy → stage: funnels_built`,
      });
      return result;
    }),

  approveFunnel: protectedProcedure
    .input(z.object({ companyId: z.number(), funnelId: z.number() }))
    .mutation(({ input }) => updateFunnelStatus(input.companyId, input.funnelId, "approved")),

  deleteFunnel: protectedProcedure
    .input(z.object({ companyId: z.number(), funnelId: z.number() }))
    .mutation(({ input }) => deleteFunnel(input.companyId, input.funnelId)),

  // ── Content Calendar ──────────────────────────────────────────────────────
  getCalendar: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getContentCalendar(input.companyId)),

  buildContent: protectedProcedure
    .input(z.object({ companyId: z.number(), months: z.number().default(1) }))
    .mutation(async ({ input, ctx }) => {
      const result = await runContentPlanning(input.companyId, input.months);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "content_calendar_built", entityType: "company", entityId: input.companyId,
        summary: `${result.length} content items planned → stage: content_planned`,
      });
      return result;
    }),

  generateCopyForItem: protectedProcedure
    .input(z.object({ companyId: z.number(), itemId: z.number() }))
    .mutation(({ input }) => generateCopyForItem(input.companyId, input.itemId)),

  generateBulkCopy: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input }) => {
      const count = await bulkGenerateCopy(input.companyId);
      return { count };
    }),

  runCopyGeneration: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await runCopyGeneration(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "copy_generated", entityType: "company", entityId: input.companyId,
        summary: `${result.count} items copywritten → stage: copy_generated`,
      });
      return result;
    }),

  updateContentItem: protectedProcedure
    .input(z.object({
      companyId: z.number(), itemId: z.number(),
      caption: z.string().optional(), brief: z.string().optional(),
      copyStatus: z.enum(["planned","briefed","copywritten","approved","published"]).optional(),
    }))
    .mutation(({ input }) => {
      const { companyId, itemId, ...data } = input;
      return updateContentItem(companyId, itemId, data);
    }),

  deleteContentItem: protectedProcedure
    .input(z.object({ companyId: z.number(), itemId: z.number() }))
    .mutation(({ input }) => deleteContentItem(input.companyId, input.itemId)),

  // ── Assets ────────────────────────────────────────────────────────────────
  getAssets: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getCompanyAssets(input.companyId)),

  detectAssetGaps: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => detectAssetGaps(input.companyId)),

  runAssetMapping: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await runAssetMappingPipeline(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "assets_mapped", entityType: "company", entityId: input.companyId,
        summary: `${result.mapped} assets mapped to content → stage: assets_mapped`,
      });
      return result;
    }),

  // Asset intake records
  getAssetIntake: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getAssetIntakeByCompany(input.companyId)),

  // Pre-flight check
  preflightCheck: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => preflightCheck(input.companyId)),

  // Full pipeline runner
  runFullPipeline: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await runFullPipeline(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "full_pipeline_complete", entityType: "company", entityId: input.companyId,
        summary: `Full execution pipeline complete: ${result.funnels.length} funnels, ${result.content.length} posts, ${result.campaigns.length} campaigns`,
      });
      await createNotification({
        companyId: input.companyId, type: "execution_ready",
        title: "Execution Pipeline Complete",
        titleAr: "اكتمل خط الإنتاج التسويقي",
        message: `All execution steps complete. Review funnels, content (${result.content.length} posts), and ${result.campaigns.length} campaign builds.`,
        messageAr: `اكتملت جميع خطوات التنفيذ. راجع الفانيلز والمحتوى (${result.content.length} منشور) و${result.campaigns.length} حملة.`,
      });
      return result;
    }),

  // Batch content approval
  approveContentBatch: protectedProcedure
    .input(z.object({ companyId: z.number(), itemIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { contentCalendar: cc } = await import("../drizzle/schema");
      for (const id of input.itemIds) {
        await db.update(cc).set({ copyStatus: "approved", updatedAt: new Date() } as any)
          .where(and(eq(cc.id, id), eq(cc.companyId, input.companyId)));
      }
      return { approved: input.itemIds.length };
    }),

  generateAdCopy: protectedProcedure
    .input(z.object({ companyId: z.number(), platform: z.string(), objective: z.string() }))
    .mutation(({ input }) => generateAdCopyVariations(input.companyId, input.platform, input.objective)),

  // ── Campaign Builds ───────────────────────────────────────────────────────
  getCampaigns: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getCampaignBuilds(input.companyId)),

  buildCampaigns: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await runCampaignBuild(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "campaigns_built", entityType: "company", entityId: input.companyId,
        summary: `${result.length} campaign build docs generated → stage: campaigns_ready`,
      });
      await createNotification({
        companyId: input.companyId, type: "execution_ready",
        title: "Campaign Builds Ready",
        titleAr: "مستندات الحملات جاهزة",
        message: `${result.length} campaign build documents generated. Review and approve before launching.`,
        messageAr: `تم توليد ${result.length} مستندات بناء الحملات. راجعها واعتمدها قبل الإطلاق.`,
      });
      return result;
    }),

  updateCampaignStatus: protectedProcedure
    .input(z.object({ companyId: z.number(), campaignId: z.number(), status: z.enum(["draft","ready","launched"]) }))
    .mutation(({ input }) => updateCampaignStatus(input.companyId, input.campaignId, input.status)),

  deleteCampaign: protectedProcedure
    .input(z.object({ companyId: z.number(), campaignId: z.number() }))
    .mutation(({ input }) => deleteCampaign(input.companyId, input.campaignId)),

  // ── Decision Ledger: retrieve run snapshots ────────────────────────────────
  getRun: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      taskId:    z.string(),
    }))
    .query(async ({ input }) => {
      const row = await getLatestBrainRun(input.companyId, input.taskId);
      return { row };
    }),

  getRunHistory: protectedProcedure
    .input(z.object({
      companyId:  z.number(),
      proposalId: z.number().optional(),
      limit:      z.number().min(1).max(100).optional(),
    }))
    .query(async ({ input }) => {
      const rows = await getBrainRunHistory({
        companyId:  input.companyId,
        proposalId: input.proposalId,
        limit:      input.limit,
      });
      return { rows };
    }),

  // ── Control-Plane: execute an AI decision after human approval ─────────────
  executeApproved: protectedProcedure
    .input(
      z.object({
        decision: z.object({
          companyId:              z.number(),
          proposalId:             z.number().optional(),
          taskId:                 z.string(),
          status:                 z.enum(["pending_approval","approved","rejected","needs_revision"]),
          recommendation:         z.string(),
          reason:                 z.string(),
          confidence:             z.number(),
          riskScore:              z.number(),
          requiresHumanApproval:  z.boolean(),
          executionAllowed:       z.boolean(),
          selectedAgents:         z.array(z.string()),
          dissentSummary:         z.array(z.string()),
          evidence:               z.array(z.any()),
          createdAt:              z.string(),
        }),
        request: z.object({
          companyId:  z.number(),
          proposalId: z.number().optional(),
          taskId:     z.string(),
          decision:   z.any(),
          mode:       z.enum(["internal","external"]),
          target:     z.string(),
          payload:    z.record(z.string(), z.unknown()),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Duplicate execution guard — block if this taskId was already executed
      const { preventDuplicateExecution: guardDup } = await import("./system_guard");
      const dupCheck = await guardDup({
        companyId:  input.decision.companyId,
        taskId:     input.decision.taskId,
        actionType: input.request.target,
      });
      if (!dupCheck.allowed) {
        return { status: "blocked" as const, reason: dupCheck.reason, receipt: null };
      }

      const gate = validateExecutionGate(input.decision as any, input.request as any);

      if (!gate.allowed) {
        return {
          status:  "blocked" as const,
          reason:  gate.reason,
          receipt: null,
        };
      }

      const { receipt, memoryWrite } =
        await runExecutionWithReceipt(input.request as any);

      // Persist to execution_logs
      await persistExecutionReceipt({
        companyId:  input.decision.companyId,
        proposalId: input.decision.proposalId,
        taskId:     input.decision.taskId,
        decision:   input.decision as any,
        request:    input.request as any,
        receipt,
      });

      await createAuditLog({
        companyId:  input.decision.companyId,
        entityType: "execution",
        entityId:   input.decision.proposalId ?? 0,
        action:     "executed_approved",
        actor:      ctx.user?.name ?? "system",
        summary:    `Execution ${receipt.status} for task=${input.decision.taskId}, target=${input.request.target}`,
      });

      return {
        status:  receipt.status as string,
        receipt,
        memoryWrite,
      };
    }),
});

// ─── Settings Router ──────────────────────────────────────────────────────────
const settingsRouter = router({
  // LLM Configs
  getLlmConfigs: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(llmConfigs).orderBy(desc(llmConfigs.isDefault), llmConfigs.category, llmConfigs.label);
    return rows.map(r => ({ ...r, apiKey: r.apiKey ? "***" : null })); // mask keys in list
  }),

  saveLlmConfig: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      provider: z.string(),
      modelId: z.string(),
      label: z.string(),
      apiKey: z.string().optional(),
      apiUrl: z.string().optional(),
      category: z.enum(["cloud_free", "cloud_paid", "local"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.id) {
        const updateData: Record<string, unknown> = {
          provider: input.provider, modelId: input.modelId, label: input.label,
          apiUrl: input.apiUrl ?? null, category: input.category, testStatus: "untested",
        };
        if (input.apiKey && input.apiKey !== "***") updateData.apiKey = input.apiKey;
        await db.update(llmConfigs).set(updateData as any).where(eq(llmConfigs.id, input.id));
        const rows = await db.select().from(llmConfigs).where(eq(llmConfigs.id, input.id));
        return rows[0];
      } else {
        const result = await db.insert(llmConfigs).values({
          provider: input.provider, modelId: input.modelId, label: input.label,
          apiKey: input.apiKey ?? null, apiUrl: input.apiUrl ?? null,
          category: input.category, isActive: true, isDefault: false,
        });
        const id = (result as any)[0]?.insertId ?? (result as any).insertId;
        const rows = await db.select().from(llmConfigs).where(eq(llmConfigs.id, Number(id)));
        return rows[0];
      }
    }),

  deleteLlmConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(llmConfigs).where(eq(llmConfigs.id, input.id));
      return { success: true };
    }),

  testLlmConfig: protectedProcedure
    .input(z.object({ id: z.number(), apiKey: z.string().optional(), apiUrl: z.string().optional(), modelId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db.select().from(llmConfigs).where(eq(llmConfigs.id, input.id));
      const config = rows[0];
      if (!config) throw new Error("Config not found");
      const apiKey = (input.apiKey && input.apiKey !== "***") ? input.apiKey : config.apiKey;
      const apiUrl = input.apiUrl || config.apiUrl || "";
      const modelId = input.modelId || config.modelId;
      try {
        const baseUrl = apiUrl.replace(/\/$/, "");
        const endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: "Say OK" }], max_tokens: 10 }),
        });
        if (!res.ok) {
          const err = await res.text();
          await db.update(llmConfigs).set({ testStatus: "failed", testError: err.slice(0, 500), lastTestedAt: new Date() }).where(eq(llmConfigs.id, input.id));
          return { success: false, error: err.slice(0, 300) };
        }
        await db.update(llmConfigs).set({ testStatus: "success", testError: null, lastTestedAt: new Date() }).where(eq(llmConfigs.id, input.id));
        return { success: true };
      } catch (e: any) {
        const errMsg = e?.message || "Unknown error";
        await db.update(llmConfigs).set({ testStatus: "failed", testError: errMsg.slice(0, 500), lastTestedAt: new Date() }).where(eq(llmConfigs.id, input.id));
        return { success: false, error: errMsg };
      }
    }),

  setDefaultLlm: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(llmConfigs).set({ isDefault: false });
      await db.update(llmConfigs).set({ isDefault: true }).where(eq(llmConfigs.id, input.id));
      const rows = await db.select().from(llmConfigs).where(eq(llmConfigs.id, input.id));
      const config = rows[0];
      if (config?.apiKey && config.apiUrl && config.modelId) {
        setActiveLlmOverride({ apiUrl: config.apiUrl, apiKey: config.apiKey, modelId: config.modelId });
      }
      return { success: true };
    }),

  // Integrations
  getIntegrations: publicProcedure
    .input(z.object({ companyId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(integrations)
        .where(input.companyId ? eq(integrations.companyId, input.companyId) : undefined as any)
        .orderBy(integrations.type);
      return rows.map(r => ({
        ...r,
        credentials: r.credentials ? Object.fromEntries(Object.entries(r.credentials).map(([k, v]) => [k, v ? "***" : ""])) : {},
      }));
    }),

  saveIntegration: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      companyId: z.number().optional(),
      type: z.string(),
      name: z.string(),
      credentials: z.record(z.string(), z.string()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.id) {
        const existing = await db.select().from(integrations).where(eq(integrations.id, input.id));
        const oldCreds = existing[0]?.credentials ?? {};
        const newCreds: Record<string, string> = { ...oldCreds as any };
        if (input.credentials) {
          for (const [k, v] of Object.entries(input.credentials)) {
            if (v && v !== "***") newCreds[k] = v;
          }
        }
        await db.update(integrations).set({
          name: input.name, credentials: newCreds as any,
          metadata: input.metadata as any, status: "pending",
        }).where(eq(integrations.id, input.id));
      } else {
        await db.insert(integrations).values({
          companyId: input.companyId ?? null, type: input.type, name: input.name,
          credentials: (input.credentials ?? {}) as any, metadata: (input.metadata ?? {}) as any,
          status: "pending",
        });
      }
      return { success: true };
    }),

  deleteIntegration: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(integrations).where(eq(integrations.id, input.id));
      return { success: true };
    }),

  markIntegrationConnected: protectedProcedure
    .input(z.object({ id: z.number(), connected: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(integrations).set({
        status: input.connected ? "connected" : "disconnected",
        lastSyncAt: input.connected ? new Date() : undefined,
      }).where(eq(integrations.id, input.id));
      return { success: true };
    }),

  // ── Ollama offline setup ──────────────────────────────────────────────────
  checkOllama: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .query(async ({ input }) => {
      try {
        const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return { running: false, modelReady: false, models: [] as string[], needsInstall: false };
        const data: any = await res.json();
        const models: string[] = (data.models ?? []).map((m: any) => m.name as string);
        const modelReady = models.some(m => m.includes(input.modelId.split(":")[0]));
        return { running: true, modelReady, models, needsInstall: false };
      } catch {
        return { running: false, modelReady: false, models: [] as string[], needsInstall: true };
      }
    }),

  pullOllamaModel: publicProcedure
    .input(z.object({ modelId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const check = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
        if (!check.ok) return { started: false, reason: "Ollama غير مشغّل — شغّله أولاً" };
      } catch {
        return { started: false, reason: "Ollama غير مثبّت أو غير مشغّل" };
      }
      const { spawn } = await import("child_process");
      const child = spawn("ollama", ["pull", input.modelId], { detached: true, stdio: "ignore", shell: true });
      child.unref();
      return { started: true, reason: `بدأ تحميل ${input.modelId} في الخلفية` };
    }),
});

// ─── Deliberation Engine Router ───────────────────────────────────────────────
const deliberationEngineRouter = router({
  // Run a full deliberation
  run: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      topic: z.string(),
      topicContext: z.string(),
      topicType: z.enum(["strategy","campaign","funnel","content","budget","channel","creative","persona","seo","general"]).default("strategy"),
      agentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await runDeliberation(
        input.companyId,
        input.topic,
        input.topicContext,
        input.topicType,
        input.agentIds as any,
      );
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "deliberation_complete", entityType: "deliberation", entityId: result.sessionId,
        summary: `Deliberation complete: "${input.topic}" — ${result.consensusReached ? "consensus reached" : "no consensus"} (${(result.confidenceScore * 100).toFixed(0)}% confidence, ${result.supportingAgents}/${result.totalAgents} agents support)`,
      });
      return result;
    }),

  // Get a specific session
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ input }) => getDeliberationSession(input.sessionId)),

  // Get all deliberations for a company
  getByCompany: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getCompanyDeliberations(input.companyId)),

  // Human approve deliberation result
  approve: protectedProcedure
    .input(z.object({ sessionId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await approveDeliberation(input.sessionId, input.notes);
      return { success: true };
    }),

  // Human request revision
  revise: protectedProcedure
    .input(z.object({ sessionId: z.number(), notes: z.string() }))
    .mutation(({ input }) => reviseDeliberation(input.sessionId, input.notes)),

  // Human reject
  reject: protectedProcedure
    .input(z.object({ sessionId: z.number(), reason: z.string() }))
    .mutation(({ input }) => rejectDeliberation(input.sessionId, input.reason)),

  // Get all decisions for a company
  getDecisions: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getCompanyDecisions(input.companyId)),

  // Get agent registry
  getAgents: publicProcedure.query(() => AGENT_REGISTRY),
});

// ─── SEO Router ───────────────────────────────────────────────────────────────
const seoRouter = router({
  getLatest: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getLatestSeoAudit(input.companyId)),

  getAll: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getSeoAudits(input.companyId)),

  runAudit: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      auditType: z.enum(["technical", "on_page", "content", "competitor_gap", "full"]).default("full"),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await runSeoAudit(input.companyId, input.auditType);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "seo_audit_run", entityType: "company", entityId: input.companyId,
        summary: `SEO audit complete: score ${result?.score ?? 0}, ${result?.issues?.length ?? 0} issues found`,
      });
      return result;
    }),
});

// ─── Monitoring Router ────────────────────────────────────────────────────────
const monitoringRouter = router({
  getSnapshots: protectedProcedure
    .input(z.object({ companyId: z.number(), entityType: z.string().optional() }))
    .query(({ input }) => getMonitoringSnapshots(input.companyId, input.entityType)),

  getLatest: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getLatestSnapshots(input.companyId)),

  addSnapshot: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      entityType: z.enum(["campaign", "funnel", "content_item", "website", "social_channel"]),
      entityId: z.number().optional(),
      platform: z.string().optional(),
      metrics: z.record(z.string(), z.union([z.number(), z.string()])),
    }))
    .mutation(({ input }) => createMonitoringSnapshot(
      input.companyId, input.entityType, input.entityId ?? null, input.platform ?? null, input.metrics
    )),

  analyze: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => analyzePerformance(input.companyId)),

  getTrend: protectedProcedure
    .input(z.object({ companyId: z.number(), days: z.number().default(30) }))
    .query(({ input }) => getPerformanceTrend(input.companyId, input.days)),
});

// ─── Brand Guardian Router ────────────────────────────────────────────────────
const brandRouter = router({
  getMentions: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getBrandMentions(input.companyId)),

  getUrgent: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getUrgentMentions(input.companyId)),

  addMention: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      source: z.enum(["twitter", "facebook", "instagram", "linkedin", "google_reviews", "trustpilot", "news", "forum", "other"]),
      content: z.string(),
      sourceUrl: z.string().optional(),
      authorName: z.string().optional(),
    }))
    .mutation(({ input }) => addBrandMention(input.companyId, input)),

  scan: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await scanBrandMentions(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "brand_scan_run", entityType: "company", entityId: input.companyId,
        summary: `Brand scan: ${result.mentionsGenerated} mentions found, ${result.urgentCount} urgent`,
      });
      return result;
    }),

  analyzeHealth: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => analyzeBrandHealth(input.companyId)),

  review: protectedProcedure
    .input(z.object({ companyId: z.number(), mentionId: z.number(), notes: z.string().optional() }))
    .mutation(({ input }) => reviewMention(input.companyId, input.mentionId, input.notes)),

  generateResponse: protectedProcedure
    .input(z.object({ companyId: z.number(), mentionId: z.number() }))
    .mutation(({ input }) => generateMentionResponse(input.companyId, input.mentionId)),
});

// ─── Customer Intelligence Router ─────────────────────────────────────────────
const customerRouter = router({
  getIssues: protectedProcedure
    .input(z.object({ companyId: z.number(), issueType: z.string().optional() }))
    .query(({ input }) => getCustomerIssues(input.companyId, input.issueType)),

  addIssue: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      issueType: z.enum(["objection", "faq", "complaint", "pre_sale_concern", "post_sale_issue", "support_theme", "feature_request"]),
      content: z.string(),
      source: z.string().optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
    }))
    .mutation(({ input }) => addCustomerIssue(input.companyId, input)),

  extractFromText: protectedProcedure
    .input(z.object({ companyId: z.number(), text: z.string(), source: z.string() }))
    .mutation(({ input }) => extractCustomerIssuesFromText(input.companyId, input.text, input.source)),

  generateFaqs: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(({ input }) => generateFaqSuggestions(input.companyId)),

  buildObjectionMap: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => buildObjectionMap(input.companyId)),

  updateStatus: protectedProcedure
    .input(z.object({
      companyId: z.number(), issueId: z.number(),
      status: z.enum(["open", "addressed", "resolved", "in_faq"]),
    }))
    .mutation(({ input }) => updateIssueStatus(input.companyId, input.issueId, input.status)),
});

// ─── Behavior Intelligence Router ─────────────────────────────────────────────
const behaviorRouter = router({
  getInsights: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getBehaviorInsights(input.companyId)),

  getSessions: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getSessions(input.companyId)),

  getEvents: protectedProcedure
    .input(z.object({ companyId: z.number(), page: z.string().optional() }))
    .query(({ input }) => getWebEvents(input.companyId, input.page)),

  logEvent: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      sessionId: z.string(),
      eventType: z.enum(["page_view", "click", "scroll", "form_submit", "video_play", "rage_click", "dead_click", "exit", "conversion", "custom"]),
      page: z.string().optional(),
      element: z.string().optional(),
      scrollDepth: z.number().optional(),
      timeOnPage: z.number().optional(),
    }))
    .mutation(({ input }) => logWebEvent(input.companyId, input)),

  analyze: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await runBehaviorAnalysis(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "behavior_analysis_run", entityType: "company", entityId: input.companyId,
        summary: `Behavior analysis: ${result.insightsGenerated} insights, ${result.criticalIssues} critical`,
      });
      return result;
    }),

  updateInsightStatus: protectedProcedure
    .input(z.object({
      companyId: z.number(), insightId: z.number(),
      status: z.enum(["acknowledged", "fixed", "dismissed"]),
    }))
    .mutation(({ input }) => updateInsightStatus(input.companyId, input.insightId, input.status)),
});

// ─── Predictive Engine Router ─────────────────────────────────────────────────
const predictiveRouter = router({
  getPredictions: protectedProcedure
    .input(z.object({ companyId: z.number(), status: z.string().optional() }))
    .query(({ input }) => getPredictions(input.companyId, input.status)),

  getActive: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getActivePredictions(input.companyId)),

  runAnalysis: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const result = await runPredictiveAnalysis(input.companyId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "predictive_analysis_run", entityType: "company", entityId: input.companyId,
        summary: `Predictive analysis: ${result.predictionsGenerated} signals, ${result.criticalCount} critical`,
      });
      return result;
    }),

  acknowledge: protectedProcedure
    .input(z.object({ companyId: z.number(), predictionId: z.number() }))
    .mutation(({ input }) => acknowledgePrediction(input.companyId, input.predictionId)),

  resolve: protectedProcedure
    .input(z.object({ companyId: z.number(), predictionId: z.number() }))
    .mutation(({ input }) => resolvePrediction(input.companyId, input.predictionId)),

  detectFatigue: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => detectContentFatigue(input.companyId)),
});

// ─── Decision Engine Router ───────────────────────────────────────────────────
const decisionRouter = router({
  getAll: protectedProcedure
    .input(z.object({ companyId: z.number(), status: z.string().optional() }))
    .query(({ input }) => getDecisions(input.companyId, input.status)),

  getPending: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .query(({ input }) => getPendingDecisions(input.companyId)),

  generate: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      situation: z.string(),
      decisionType: z.enum(["strategy", "campaign", "content", "budget", "channel", "creative", "audience", "seo", "optimization"]),
      deliberationId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await generateDecision(input.companyId, input.situation, input.decisionType, input.deliberationId);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "decision_generated", entityType: "decision", entityId: id,
        summary: `Decision generated: ${input.decisionType} — "${input.situation.substring(0, 60)}"`,
      });
      return { id };
    }),

  generateFromPredictions: protectedProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ input }) => {
      const id = await generateDecisionFromPredictions(input.companyId);
      return { id };
    }),

  approve: protectedProcedure
    .input(z.object({ companyId: z.number(), decisionId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await approveDecisionItem(input.companyId, input.decisionId, input.notes);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "decision_approved", entityType: "decision", entityId: input.decisionId,
        summary: `Decision #${input.decisionId} approved`,
      });
      return { success: true };
    }),

  reject: protectedProcedure
    .input(z.object({ companyId: z.number(), decisionId: z.number(), notes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await rejectDecisionItem(input.companyId, input.decisionId, input.notes);
      await createAuditLog({
        companyId: input.companyId, actor: ctx.user.name ?? "system",
        action: "decision_rejected", entityType: "decision", entityId: input.decisionId,
        summary: `Decision #${input.decisionId} rejected`,
      });
      return { success: true };
    }),

  defer: protectedProcedure
    .input(z.object({ companyId: z.number(), decisionId: z.number(), notes: z.string().optional() }))
    .mutation(({ input }) => deferDecision(input.companyId, input.decisionId, input.notes)),

  updateNotes: protectedProcedure
    .input(z.object({ companyId: z.number(), decisionId: z.number(), notes: z.string() }))
    .mutation(({ input }) => updateDecisionNotes(input.companyId, input.decisionId, input.notes)),
});

// ─── Learning Engine Router ───────────────────────────────────────────────────
const learningRouter = router({
  // External Ideas
  getIdeas: protectedProcedure
    .input(z.object({ companyId: z.number().optional() }))
    .query(({ input }) => getExternalIdeas(input.companyId)),

  addIdea: protectedProcedure
    .input(z.object({
      companyId: z.number().optional(),
      title: z.string(),
      sourceUrl: z.string().optional(),
      sourceType: z.enum(["github_repo", "article", "tool", "workflow", "doc", "example", "plugin", "other"]),
      rawContent: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await addExternalIdea({ ...input, addedBy: ctx.user.name ?? ctx.user.openId });
      return { id };
    }),

  reviewIdea: protectedProcedure
    .input(z.object({
      ideaId: z.number(),
      decision: z.enum(["approved", "rejected", "deferred"]),
      companyId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await reviewIdea(input.ideaId, input.decision, input.companyId);
      await createAuditLog({
        companyId: input.companyId ?? 0, actor: ctx.user.name ?? "system",
        action: `idea_${input.decision}`, entityType: "external_idea", entityId: input.ideaId,
        summary: `External idea #${input.ideaId} ${input.decision}`,
      });
      return { success: true };
    }),

  markImplemented: protectedProcedure
    .input(z.object({ ideaId: z.number() }))
    .mutation(({ input }) => markIdeaImplemented(input.ideaId)),

  // Skills Registry
  getSkills: publicProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(({ input }) => getSkills(input.status)),

  discoverSkill: protectedProcedure
    .input(z.object({
      name: z.string(),
      category: z.enum(["seo", "social_listening", "analytics", "content", "crm", "reporting", "ux", "ads", "automation", "other"]),
      description: z.string().optional(),
      sourceUrl: z.string().optional(),
      implementationType: z.enum(["api", "npm_package", "python_tool", "manual", "webhook", "other"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await discoverSkill(input);
      await createAuditLog({
        companyId: 0, actor: ctx.user.name ?? "system",
        action: "skill_discovered", entityType: "skill", entityId: id,
        summary: `Skill discovered: "${input.name}" (${input.category})`,
      });
      return { id };
    }),

  approveSkill: protectedProcedure
    .input(z.object({ skillId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await approveSkill(input.skillId);
      await createAuditLog({
        companyId: 0, actor: ctx.user.name ?? "system",
        action: "skill_approved", entityType: "skill", entityId: input.skillId,
        summary: `Skill #${input.skillId} approved`,
      });
      return { success: true };
    }),

  rejectSkill: protectedProcedure
    .input(z.object({ skillId: z.number() }))
    .mutation(({ input }) => rejectSkill(input.skillId)),

  markSkillIntegrated: protectedProcedure
    .input(z.object({ skillId: z.number() }))
    .mutation(({ input }) => markSkillIntegrated(input.skillId)),

  scanForNewSkills: protectedProcedure
    .mutation(async ({ ctx }) => {
      const count = await scanForNewSkills();
      await createAuditLog({
        companyId: 0, actor: ctx.user.name ?? "system",
        action: "skills_scan_run", entityType: "system", entityId: 0,
        summary: `Skills scan: ${count} new skills discovered`,
      });
      return { count };
    }),
});

// ─── Command Center Router ────────────────────────────────────────────────────
const commandCenterRouter = router({
  getHistory: protectedProcedure
    .input(z.object({ companyId: z.number(), limit: z.number().default(50) }))
    .query(({ input }) => getCommandHistory(input.companyId, input.limit)),

  sendMessage: protectedProcedure
    .input(z.object({
      companyId: z.number(),
      message: z.string().min(1),
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      // Save user message
      await saveCommandMessage(input.companyId, "user", input.message);

      // Process
      const result = await processCommandMessage(
        input.companyId,
        input.message,
        input.history,
        ctx.user.name ?? ctx.user.openId,
      );

      // Save assistant reply
      await saveCommandMessage(input.companyId, "assistant", result.reply, {
        action: result.action,
        actionResult: result.actionResult,
      });

      return result;
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  companies: companiesRouter,
  proposals: proposalsRouter,
  approvals: approvalsRouter,
  notifications: notificationsRouter,
  memory: memoryRouter,
  agents: agentsRouter,
  audit: auditRouter,
  chat: chatRouter,
  files: filesRouter,
  research: researchRouter,
  intelligence: intelligenceRouter,
  pipeline: pipelineRouter,
  execution: executionRouter,
  settings: settingsRouter,
  deliberationEngine: deliberationEngineRouter,
  seo: seoRouter,
  monitoring: monitoringRouter,
  brand: brandRouter,
  customer: customerRouter,
  behavior: behaviorRouter,
  predictive: predictiveRouter,
  decisions: decisionRouter,
  learning: learningRouter,
  commandCenter: commandCenterRouter,
  brainApproval: approvalRouter,
});

export type AppRouter = typeof appRouter;
