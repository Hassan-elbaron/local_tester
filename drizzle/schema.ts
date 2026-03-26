import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  float,
  bigint,
  decimal,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  preferredLanguage: mysqlEnum("preferredLanguage", ["en", "ar"]).default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// ─── Companies ────────────────────────────────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameAr: varchar("nameAr", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 500 }),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  logoUrl: varchar("logoUrl", { length: 500 }),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#6366f1"),
  isActive: boolean("isActive").default(true).notNull(),
  // Brand intelligence
  brandVoice: text("brandVoice"),
  brandVoiceAr: text("brandVoiceAr"),
  targetAudience: text("targetAudience"),
  competitors: json("competitors").$type<string[]>().$default(() => []),
  knowledgeStatus: mysqlEnum("knowledgeStatus", ["empty", "partial", "complete"]).default("empty").notNull(),
  externalResearchApproved: boolean("externalResearchApproved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Company Memory (persistent context per company) ──────────────────────────
export const companyMemory = mysqlTable("company_memory", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: json("value").notNull(),
  category: mysqlEnum("category", [
    "strategy", "audience", "competitors", "brand", "performance",
    "preferences", "decisions", "campaigns", "results", "assets", "guidelines"
  ]).notNull(),
  importance: int("importance").default(3).notNull(), // 1-5 scale
  source: mysqlEnum("source", ["manual", "file_upload", "analytics", "agent", "external_research"]).default("manual").notNull(),
  sourceRef: varchar("sourceRef", { length: 500 }), // file ID or URL
  tags: json("tags").$type<string[]>().$default(() => []),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Company Files (uploaded brand assets & documents) ────────────────────────
export const companyFiles = mysqlTable("company_files", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 1000 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }).notNull(),
  category: mysqlEnum("category", [
    "logo", "brand_guidelines", "creative", "report", "brief",
    "audience_doc", "competitor_analysis", "pricing", "sales_doc", "other"
  ]).default("other").notNull(),
  description: text("description"),
  // Knowledge extraction status
  extractionStatus: mysqlEnum("extractionStatus", ["pending", "processing", "complete", "failed"]).default("pending").notNull(),
  extractedKnowledge: json("extractedKnowledge").$type<Record<string, unknown>>(),
  knowledgeMemoryIds: json("knowledgeMemoryIds").$type<number[]>().$default(() => []),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Proposals ────────────────────────────────────────────────────────────────
export const proposals = mysqlTable("proposals", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  titleAr: varchar("titleAr", { length: 500 }),
  description: text("description"),
  descriptionAr: text("descriptionAr"),
  type: mysqlEnum("type", ["strategy", "campaign", "budget", "content", "seo", "paid_media", "crm", "funnel"]).notNull(),
  // Full 10-state lifecycle
  status: mysqlEnum("status", [
    "draft",
    "proposed",
    "under_deliberation",
    "pending_approval",
    "approved",
    "rejected",
    "needs_revision",
    "ready_for_execution",
    "executed",
    "rolled_back"
  ]).default("draft").notNull(),
  version: int("version").default(1).notNull(),
  parentId: int("parentId"), // for revisions - points to original proposal
  budget: float("budget"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  timeline: varchar("timeline", { length: 100 }),
  channels: json("channels").$type<string[]>().$default(() => []),
  recommendation: text("recommendation"),
  recommendationAr: text("recommendationAr"),
  alternatives: json("alternatives").$type<string[]>().$default(() => []),
  risks: json("risks").$type<string[]>().$default(() => []),
  expectedOutcomes: json("expectedOutcomes").$type<string[]>().$default(() => []),
  // Revision tracking
  revisionHistory: json("revisionHistory").$type<Array<{
    version: number;
    status: string;
    reason: string;
    timestamp: string;
    actor: string;
  }>>().$default(() => []),
  metadata: json("metadata").$type<Record<string, unknown>>().$default(() => ({})),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Proposal Options (multiple strategy options generated per proposal) ───────
export const proposalOptions = mysqlTable("proposal_options", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  companyId: int("companyId").notNull(),
  deliberationId: int("deliberationId"),
  optionIndex: int("optionIndex").notNull(), // 1, 2, 3...
  title: varchar("title", { length: 500 }).notNull(),
  titleAr: varchar("titleAr", { length: 500 }),
  description: text("description").notNull(),
  descriptionAr: text("descriptionAr"),
  // Evaluation scores per dimension
  scores: json("scores").$type<{
    feasibility: number;
    roi: number;
    risk: number;
    speed: number;
    brandFit: number;
    overall: number;
  }>().notNull(),
  pros: json("pros").$type<string[]>().$default(() => []),
  cons: json("cons").$type<string[]>().$default(() => []),
  estimatedBudget: float("estimatedBudget"),
  estimatedTimeline: varchar("estimatedTimeline", { length: 100 }),
  channels: json("channels").$type<string[]>().$default(() => []),
  isRecommended: boolean("isRecommended").default(false).notNull(),
  whyRecommended: text("whyRecommended"),
  whyOthersRejected: text("whyOthersRejected"),
  agentVotes: json("agentVotes").$type<Array<{
    agentRole: string;
    votedFor: boolean;
    reason: string;
  }>>().$default(() => []),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Decision Trace (full reasoning trail per proposal) ───────────────────────
export const decisionTrace = mysqlTable("decision_trace", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  companyId: int("companyId").notNull(),
  deliberationId: int("deliberationId"),
  // The full structured trace
  problemStatement: text("problemStatement"),
  contextUsed: json("contextUsed").$type<{
    memoryKeys: string[];
    filesUsed: string[];
    companyData: Record<string, unknown>;
  }>(),
  optionsGenerated: int("optionsGenerated").default(0).notNull(),
  evaluationCriteria: json("evaluationCriteria").$type<string[]>().$default(() => []),
  agentConsensus: json("agentConsensus").$type<{
    totalAgents: number;
    supporting: number;
    opposing: number;
    abstaining: number;
    consensusScore: number;
  }>(),
  finalDecision: text("finalDecision"),
  finalDecisionAr: text("finalDecisionAr"),
  decisionRationale: text("decisionRationale"),
  decisionRationaleAr: text("decisionRationaleAr"),
  rejectedAlternatives: json("rejectedAlternatives").$type<Array<{
    title: string;
    reason: string;
  }>>().$default(() => []),
  keyInsights: json("keyInsights").$type<string[]>().$default(() => []),
  keyInsightsAr: json("keyInsightsAr").$type<string[]>().$default(() => []),
  humanDecision: mysqlEnum("humanDecision", ["pending", "approved", "rejected", "revision_requested"]).default("pending").notNull(),
  humanDecisionReason: text("humanDecisionReason"),
  humanDecisionAt: timestamp("humanDecisionAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Deliberations ────────────────────────────────────────────────────────────
export const deliberations = mysqlTable("deliberations", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  companyId: int("companyId").notNull(),
  status: mysqlEnum("status", ["in_progress", "completed", "failed"]).default("in_progress").notNull(),
  totalRounds: int("totalRounds").default(0).notNull(),
  consensusScore: float("consensusScore"),
  finalRecommendation: text("finalRecommendation"),
  finalRecommendationAr: text("finalRecommendationAr"),
  alternativeOptions: json("alternativeOptions").$type<AlternativeOption[]>().$default(() => []),
  rounds: json("rounds").$type<DeliberationRound[]>().$default(() => []),
  summary: text("summary"),
  summaryAr: text("summaryAr"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

// ─── Approvals ────────────────────────────────────────────────────────────────
export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  companyId: int("companyId").notNull(),
  deliberationId: int("deliberationId"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "revised"]).default("pending").notNull(),
  version: int("version").default(1).notNull(),
  recommendation: text("recommendation"),
  recommendationAr: text("recommendationAr"),
  risks: json("risks").$type<string[]>().$default(() => []),
  consensusScore: float("consensusScore"),
  approvedBy: varchar("approvedBy", { length: 255 }),
  approvalReason: text("approvalReason"),
  rejectionReason: text("rejectionReason"),
  revisionNotes: text("revisionNotes"),
  alternativeSuggestions: json("alternativeSuggestions").$type<string[]>().$default(() => []),
  approvedAt: timestamp("approvedAt"),
  rejectedAt: timestamp("rejectedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  entityType: mysqlEnum("entityType", ["company", "proposal", "deliberation", "approval", "agent", "memory", "system", "file"]).notNull(),
  entityId: int("entityId"),
  action: varchar("action", { length: 100 }).notNull(),
  actor: varchar("actor", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  summaryAr: text("summaryAr"),
  before: json("before").$type<Record<string, unknown>>(),
  after: json("after").$type<Record<string, unknown>>(),
  metadata: json("metadata").$type<Record<string, unknown>>().$default(() => ({})),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  type: mysqlEnum("type", [
    "approval_request", "approval_decision", "deliberation_complete",
    "proposal_update", "system", "agent_insight", "file_processed",
    "revision_needed", "anomaly", "opportunity", "execution_ready"
  ]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  titleAr: varchar("titleAr", { length: 500 }),
  message: text("message").notNull(),
  messageAr: text("messageAr"),
  isRead: boolean("isRead").default(false).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  entityType: varchar("entityType", { length: 50 }),
  entityId: int("entityId"),
  actionUrl: varchar("actionUrl", { length: 500 }),
  metadata: json("metadata").$type<Record<string, unknown>>().$default(() => ({})),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Agent Opinions (stored per deliberation round) ───────────────────────────
export const agentOpinions = mysqlTable("agent_opinions", {
  id: int("id").autoincrement().primaryKey(),
  deliberationId: int("deliberationId").notNull(),
  companyId: int("companyId").notNull(),
  round: int("round").notNull(),
  agentRole: varchar("agentRole", { length: 100 }).notNull(),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  opinion: text("opinion").notNull(),
  opinionAr: text("opinionAr"),
  recommendation: text("recommendation"),
  confidence: float("confidence").notNull(),
  concerns: json("concerns").$type<string[]>().$default(() => []),
  suggestions: json("suggestions").$type<string[]>().$default(() => []),
  votedFor: boolean("votedFor").default(true).notNull(),
  // Which option this agent voted for (if multiple options)
  preferredOptionIndex: int("preferredOptionIndex"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Chat Messages ────────────────────────────────────────────────────────────
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  contentAr: text("contentAr"),
  agentRole: varchar("agentRole", { length: 100 }),
  // Command tracking
  commandType: mysqlEnum("commandType", [
    "chat", "analyze", "propose", "approve", "reject",
    "retrieve_memory", "compare_options", "explain_decision",
    "preview_execution", "summarize"
  ]).default("chat").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }),
  relatedEntityId: int("relatedEntityId"),
  metadata: json("metadata").$type<Record<string, unknown>>().$default(() => ({})),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Execution Previews ───────────────────────────────────────────────────────
export const executionPreviews = mysqlTable("execution_previews", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  companyId: int("companyId").notNull(),
  approvalId: int("approvalId").notNull(),
  status: mysqlEnum("status", ["draft", "ready", "approved", "executed"]).default("draft").notNull(),
  // Campaign structure
  campaignStructure: json("campaignStructure").$type<{
    name: string;
    objective: string;
    budget: number;
    duration: string;
    adSets: Array<{
      name: string;
      audience: string;
      budget: number;
      placements: string[];
    }>;
  }>(),
  // Ad previews per platform
  adPreviews: json("adPreviews").$type<Array<{
    platform: string;
    placement: string;
    headline: string;
    body: string;
    cta: string;
    imageUrl?: string;
    previewNotes: string;
  }>>().$default(() => []),
  // Execution steps
  executionSteps: json("executionSteps").$type<Array<{
    step: number;
    action: string;
    description: string;
    estimatedTime: string;
    requiresHumanAction: boolean;
  }>>().$default(() => []),
  // What will change / what won't
  changeLog: json("changeLog").$type<{
    willChange: string[];
    wontChange: string[];
    risks: string[];
  }>(),
  humanPreviewApproved: boolean("humanPreviewApproved").default(false).notNull(),
  humanPreviewApprovedAt: timestamp("humanPreviewApprovedAt"),
  humanPreviewNotes: text("humanPreviewNotes"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── TypeScript Types ─────────────────────────────────────────────────────────
export type AlternativeOption = {
  id: string;
  title: string;
  titleAr?: string;
  description: string;
  pros: string[];
  cons: string[];
  confidence: number;
  estimatedImpact: { reach: string; conversion: string; roi: string };
};
export type DeliberationRound = {
  round: number;
  agentOpinions: AgentOpinionData[];
  consensusScore: number;
  summary: string;
};
export type AgentOpinionData = {
  agentRole: string;
  agentName: string;
  opinion: string;
  recommendation: string;
  confidence: number;
  concerns: string[];
  suggestions: string[];
  votedFor: boolean;
};

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = typeof proposals.$inferInsert;
export type Deliberation = typeof deliberations.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AgentOpinion = typeof agentOpinions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type CompanyFile = typeof companyFiles.$inferSelect;
export type ProposalOption = typeof proposalOptions.$inferSelect;
export type DecisionTrace = typeof decisionTrace.$inferSelect;
export type ExecutionPreview = typeof executionPreviews.$inferSelect;

// ─── External Research Requests (Approval Gate) ───────────────────────────────
export const externalResearchRequests = mysqlTable("external_research_requests", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  // What will be researched
  searchTargets: json("searchTargets").$type<string[]>().notNull(),   // website, social, news, etc.
  dataSources: json("dataSources").$type<string[]>().notNull(),       // which sources
  researchGoal: text("researchGoal").notNull(),
  researchGoalAr: text("researchGoalAr"),
  // Frequency policy
  frequency: mysqlEnum("frequency", ["one_time", "weekly", "monthly"]).default("one_time").notNull(),
  // Approval gate
  status: mysqlEnum("status", ["pending_approval", "approved", "rejected", "running", "complete", "failed"]).default("pending_approval").notNull(),
  approvedBy: varchar("approvedBy", { length: 255 }),
  approvedAt: timestamp("approvedAt"),
  rejectedBy: varchar("rejectedBy", { length: 255 }),
  rejectionReason: text("rejectionReason"),
  // Results
  result: json("result").$type<Record<string, unknown>>(),
  memoryKeysCreated: json("memoryKeysCreated").$type<number[]>().$default(() => []),
  // Metadata
  requestedBy: varchar("requestedBy", { length: 255 }).notNull(),
  estimatedDataSize: varchar("estimatedDataSize", { length: 50 }),
  privacyNote: text("privacyNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExternalResearchRequest = typeof externalResearchRequests.$inferSelect;

// ─── Learnings ────────────────────────────────────────────────────────────────
export const learnings = mysqlTable("learnings", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  // Source event
  eventType: mysqlEnum("eventType", [
    "proposal_approved", "proposal_rejected", "proposal_revised",
    "deliberation_complete", "campaign_result", "option_selected",
    "pattern_detected"
  ]).notNull(),
  entityId: int("entityId"), // proposal_id, deliberation_id, etc.
  entityType: varchar("entityType", { length: 50 }),
  // Learning content
  whatHappened: text("whatHappened").notNull(),
  whySucceeded: text("whySucceeded"),
  whyFailed: text("whyFailed"),
  pattern: text("pattern"), // recurring pattern detected
  actionableInsight: text("actionableInsight").notNull(),
  // Classification
  category: mysqlEnum("category", [
    "budget", "audience", "creative", "timing", "channel",
    "approval_pattern", "owner_preference", "market", "general"
  ]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).default("0.70"),
  // Status
  reviewedByHuman: boolean("reviewedByHuman").default(false),
  appliedToRules: boolean("appliedToRules").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Learning = typeof learnings.$inferSelect;

// ─── System Rules ─────────────────────────────────────────────────────────────
export const systemRules = mysqlTable("system_rules", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  ruleText: text("ruleText").notNull(),
  ruleTextAr: text("ruleTextAr"),
  appliesTo: mysqlEnum("appliesTo", [
    "proposals", "budget", "audience", "creative", "timing",
    "channel", "approval", "general"
  ]).notNull(),
  sourceLearningIds: json("sourceLearningIds").$type<number[]>().$default(() => []),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).default("0.80"),
  // Governance: human must approve before rule is active
  approvedByHuman: boolean("approvedByHuman").default(false),
  approvedAt: timestamp("approvedAt"),
  approvedBy: varchar("approvedBy", { length: 255 }),
  isActive: boolean("isActive").default(false),
  timesApplied: int("timesApplied").default(0),
  successRate: decimal("successRate", { precision: 5, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SystemRule = typeof systemRules.$inferSelect;

// ─── Campaign Results (Closed-Loop) ──────────────────────────────────────────
export const campaignResults = mysqlTable("campaign_results", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  proposalId: int("proposalId").notNull(),
  // Actual performance metrics
  actualRoas: decimal("actualRoas", { precision: 8, scale: 2 }),
  actualCpa: decimal("actualCpa", { precision: 10, scale: 2 }),
  actualReach: int("actualReach"),
  actualImpressions: int("actualImpressions"),
  actualClicks: int("actualClicks"),
  actualConversions: int("actualConversions"),
  actualSpend: decimal("actualSpend", { precision: 12, scale: 2 }),
  actualRevenue: decimal("actualRevenue", { precision: 12, scale: 2 }),
  // Period
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  // Comparison to predictions
  predictedRoas: decimal("predictedRoas", { precision: 8, scale: 2 }),
  predictedCpa: decimal("predictedCpa", { precision: 10, scale: 2 }),
  // Analysis
  performanceVsPrediction: mysqlEnum("performanceVsPrediction", [
    "exceeded", "met", "below", "far_below"
  ]),
  notes: text("notes"),
  learningExtracted: boolean("learningExtracted").default(false),
  learningId: int("learningId"),
  enteredBy: varchar("enteredBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CampaignResult = typeof campaignResults.$inferSelect;

// ─── Owner Preferences (Personalization) ─────────────────────────────────────
export const ownerPreferences = mysqlTable("owner_preferences", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  // What the owner tends to approve/reject
  preferenceType: mysqlEnum("preferenceType", [
    "budget_range", "proposal_type", "channel_preference",
    "timing_preference", "risk_tolerance", "creative_style",
    "audience_focus", "general"
  ]).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: json("value").$type<unknown>(),
  evidence: text("evidence"), // which decisions led to this inference
  confidence: decimal("confidence", { precision: 5, scale: 2 }).default("0.70"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OwnerPreference = typeof ownerPreferences.$inferSelect;

// ─── Project Pipeline (Central Lifecycle State Machine) ───────────────────────
export const projectPipeline = mysqlTable("project_pipeline", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  currentStage: varchar("currentStage", { length: 100 }).default("init").notNull(),
  // Full lifecycle: init → intake_done → business_understood → competitors_pending_review
  // → competitors_confirmed → personas_ready → deliberation_active → strategy_generated
  // → strategy_in_review → strategy_approved → funnels_built → content_planned
  // → assets_mapped → copy_generated → campaigns_ready → monitoring_active
  // → optimizing → learning_active
  completedStages: json("completedStages").$type<string[]>().$default(() => []),
  intakeData: json("intakeData").$type<Record<string, unknown>>(),
  businessReport: json("businessReport").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProjectPipeline = typeof projectPipeline.$inferSelect;

// ─── Competitor Profiles ───────────────────────────────────────────────────────
export const competitorProfiles = mysqlTable("competitor_profiles", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 500 }),
  status: mysqlEnum("status", ["discovered", "confirmed", "rejected"]).default("discovered").notNull(),
  analysis: json("analysis").$type<Record<string, unknown>>(),
  strengths: json("strengths").$type<string[]>().$default(() => []),
  weaknesses: json("weaknesses").$type<string[]>().$default(() => []),
  discoveredBy: mysqlEnum("discoveredBy", ["system", "user"]).default("system").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompetitorProfile = typeof competitorProfiles.$inferSelect;

// ─── Personas ─────────────────────────────────────────────────────────────────
export const personas = mysqlTable("personas", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  demographics: json("demographics").$type<Record<string, unknown>>(),
  painPoints: json("painPoints").$type<string[]>().$default(() => []),
  motivations: json("motivations").$type<string[]>().$default(() => []),
  objections: json("objections").$type<string[]>().$default(() => []),
  buyingTriggers: json("buyingTriggers").$type<string[]>().$default(() => []),
  channels: json("channels").$type<string[]>().$default(() => []),
  status: mysqlEnum("status", ["draft", "approved"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Persona = typeof personas.$inferSelect;

// ─── Master Strategy ──────────────────────────────────────────────────────────
export const masterStrategy = mysqlTable("master_strategy", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  version: int("version").default(1).notNull(),
  status: mysqlEnum("status", ["draft", "in_review", "approved", "superseded"]).default("draft").notNull(),
  positioning: text("positioning"),
  brandMessage: text("brandMessage"),
  toneOfVoice: text("toneOfVoice"),
  channelStrategy: json("channelStrategy").$type<Record<string, unknown>>(),
  funnelArchitecture: json("funnelArchitecture").$type<Record<string, unknown>>(),
  contentStrategy: json("contentStrategy").$type<Record<string, unknown>>(),
  seoStrategy: json("seoStrategy").$type<Record<string, unknown>>(),
  paidMediaStrategy: json("paidMediaStrategy").$type<Record<string, unknown>>(),
  automationStrategy: json("automationStrategy").$type<Record<string, unknown>>(),
  kpis: json("kpis").$type<Record<string, unknown>>(),
  executionPriorities: json("executionPriorities").$type<string[]>().$default(() => []),
  agentConsensus: json("agentConsensus").$type<Record<string, unknown>>(),
  revisionHistory: json("revisionHistory").$type<Array<{ version: number; note: string; timestamp: string }>>().$default(() => []),
  approvedAt: timestamp("approvedAt"),
  approvedBy: varchar("approvedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MasterStrategy = typeof masterStrategy.$inferSelect;

// ─── Funnels ──────────────────────────────────────────────────────────────────
export const funnels = mysqlTable("funnels", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  strategyId: int("strategyId"),
  name: varchar("name", { length: 255 }).notNull(),
  goal: text("goal"),
  stage: mysqlEnum("stage", ["awareness", "consideration", "conversion", "retention"]).default("awareness").notNull(),
  channels: json("channels").$type<string[]>().$default(() => []),
  steps: json("steps").$type<Array<{ step: number; action: string; description: string; cta: string }>>().$default(() => []),
  kpis: json("kpis").$type<Record<string, string>>(),
  budgetPct: float("budgetPct"),
  entryPoint: text("entryPoint"),
  conversionEvent: text("conversionEvent"),
  retargetingPath: text("retargetingPath"),
  automationPath: text("automationPath"),
  status: mysqlEnum("status", ["draft", "approved"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Funnel = typeof funnels.$inferSelect;

// ─── Content Calendar ─────────────────────────────────────────────────────────
export const contentCalendar = mysqlTable("content_calendar", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  funnelId: int("funnelId"),
  platform: varchar("platform", { length: 100 }).notNull(),
  funnelStage: varchar("funnelStage", { length: 100 }),
  objective: text("objective"),
  concept: text("concept"),
  brief: text("brief"),
  caption: text("caption"),
  ctaText: varchar("ctaText", { length: 255 }),
  visualNotes: text("visualNotes"),
  requiredAssets: json("requiredAssets").$type<string[]>().$default(() => []),
  scheduledDate: timestamp("scheduledDate"),
  week: int("week"),
  month: int("month"),
  copyStatus: mysqlEnum("copyStatus", ["planned", "briefed", "copywritten", "approved", "published"]).default("planned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ContentItem = typeof contentCalendar.$inferSelect;

// ─── Campaign Builds ──────────────────────────────────────────────────────────
export const campaignBuilds = mysqlTable("campaign_builds", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  funnelId: int("funnelId"),
  name: varchar("name", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 100 }).notNull(),
  objective: varchar("objective", { length: 255 }),
  structure: json("structure").$type<Record<string, unknown>>(),
  audiences: json("audiences").$type<Array<Record<string, unknown>>>().$default(() => []),
  budgetLogic: json("budgetLogic").$type<Record<string, unknown>>(),
  abTestMatrix: json("abTestMatrix").$type<Array<Record<string, unknown>>>().$default(() => []),
  launchChecklist: json("launchChecklist").$type<string[]>().$default(() => []),
  buildDocs: text("buildDocs"),
  status: mysqlEnum("status", ["draft", "ready", "launched"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CampaignBuild = typeof campaignBuilds.$inferSelect;

// ─── LLM Configurations (global) ──────────────────────────────────────────────
export const llmConfigs = mysqlTable("llm_configs", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 100 }).notNull(),
  modelId: varchar("modelId", { length: 255 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  apiKey: text("apiKey"),
  apiUrl: varchar("apiUrl", { length: 500 }),
  category: mysqlEnum("category", ["cloud_free", "cloud_paid", "local"]).default("cloud_free").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  testStatus: mysqlEnum("testStatus", ["untested", "success", "failed"]).default("untested"),
  testError: text("testError"),
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LlmConfig = typeof llmConfigs.$inferSelect;

// ─── Integrations (per-company: social media, analytics, etc.) ────────────────
export const integrations = mysqlTable("integrations", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId"),
  type: varchar("type", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  credentials: json("credentials").$type<Record<string, string>>(),
  status: mysqlEnum("status", ["connected", "disconnected", "error", "pending"]).default("disconnected").notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  lastSyncAt: timestamp("lastSyncAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Integration = typeof integrations.$inferSelect;

// ─── Asset Intake (per-post asset tracking) ───────────────────────────────────
export const assetIntake = mysqlTable("asset_intake", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  contentItemId: int("contentItemId"),          // which content post this asset serves
  fileId: int("fileId"),                         // link to companyFiles if uploaded
  assetName: varchar("assetName", { length: 255 }).notNull(),
  assetType: varchar("assetType", { length: 100 }), // logo, product_photo, lifestyle, video, graphic, etc.
  source: mysqlEnum("source", ["uploaded", "drive_link", "url", "auto_detected", "missing"]).default("missing").notNull(),
  driveLink: varchar("driveLink", { length: 1000 }),
  externalUrl: varchar("externalUrl", { length: 1000 }),
  mappedTo: json("mappedTo").$type<number[]>().$default(() => []), // contentItemIds this asset serves
  gapStatus: mysqlEnum("gapStatus", ["available", "missing", "partial"]).default("missing").notNull(),
  recommendation: text("recommendation"),        // what type of asset is needed
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AssetIntakeItem = typeof assetIntake.$inferSelect;

// ─── SEO Audits ───────────────────────────────────────────────────────────────
export const seoAudits = mysqlTable("seo_audits", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  url: varchar("url", { length: 1000 }),
  auditType: mysqlEnum("auditType", ["technical", "on_page", "content", "competitor_gap", "full"]).default("full").notNull(),
  status: mysqlEnum("status", ["pending", "running", "complete", "failed"]).default("pending").notNull(),
  score: int("score"),                         // 0-100
  issues: json("issues").$type<Array<{ severity: "critical"|"high"|"medium"|"low"; type: string; description: string; url?: string; fix: string }>>().$default(() => []),
  opportunities: json("opportunities").$type<string[]>().$default(() => []),
  technicalReport: json("technicalReport").$type<Record<string, unknown>>(),
  onPageReport: json("onPageReport").$type<Record<string, unknown>>(),
  contentGaps: json("contentGaps").$type<string[]>().$default(() => []),
  keywordOpportunities: json("keywordOpportunities").$type<Array<{ keyword: string; volume: string; difficulty: string; currentRank?: string }>>().$default(() => []),
  priorityQueue: json("priorityQueue").$type<Array<{ priority: number; task: string; impact: string; effort: string }>>().$default(() => []),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SeoAudit = typeof seoAudits.$inferSelect;

// ─── Monitoring Snapshots ─────────────────────────────────────────────────────
export const monitoringSnapshots = mysqlTable("monitoring_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  entityType: mysqlEnum("entityType", ["campaign", "funnel", "content_item", "website", "social_channel"]).notNull(),
  entityId: int("entityId"),
  platform: varchar("platform", { length: 100 }),
  snapshotDate: timestamp("snapshotDate").defaultNow().notNull(),
  metrics: json("metrics").$type<Record<string, number | string>>().$default(() => ({})),
  // Standard KPIs stored directly for indexing
  impressions: int("impressions"),
  clicks: int("clicks"),
  spend: decimal("spend", { precision: 12, scale: 2 }),
  conversions: int("conversions"),
  revenue: decimal("revenue", { precision: 12, scale: 2 }),
  ctr: decimal("ctr", { precision: 8, scale: 4 }),
  cpa: decimal("cpa", { precision: 10, scale: 2 }),
  roas: decimal("roas", { precision: 8, scale: 2 }),
  status: mysqlEnum("status", ["on_track", "warning", "critical", "paused"]).default("on_track").notNull(),
  alerts: json("alerts").$type<Array<{ type: string; message: string; severity: "info"|"warning"|"critical" }>>().$default(() => []),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MonitoringSnapshot = typeof monitoringSnapshots.$inferSelect;

// ─── Brand Mentions ───────────────────────────────────────────────────────────
export const brandMentions = mysqlTable("brand_mentions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  source: mysqlEnum("source", ["twitter", "facebook", "instagram", "linkedin", "google_reviews", "trustpilot", "news", "forum", "other"]).default("other").notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  authorName: varchar("authorName", { length: 255 }),
  content: text("content").notNull(),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]).default("neutral").notNull(),
  sentimentScore: decimal("sentimentScore", { precision: 5, scale: 2 }),  // -1.0 to 1.0
  category: mysqlEnum("category", ["complaint", "praise", "question", "mention", "review", "news"]).default("mention").notNull(),
  isUrgent: boolean("isUrgent").default(false).notNull(),
  isReviewed: boolean("isReviewed").default(false).notNull(),
  reviewNotes: text("reviewNotes"),
  mentionedAt: timestamp("mentionedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BrandMention = typeof brandMentions.$inferSelect;

// ─── Customer Issues ──────────────────────────────────────────────────────────
export const customerIssues = mysqlTable("customer_issues", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  issueType: mysqlEnum("issueType", ["objection", "faq", "complaint", "pre_sale_concern", "post_sale_issue", "support_theme", "feature_request"]).notNull(),
  content: text("content").notNull(),
  frequency: int("frequency").default(1).notNull(),  // how many times this issue appeared
  source: varchar("source", { length: 100 }),        // where it came from
  sourceRefs: json("sourceRefs").$type<string[]>().$default(() => []),  // URLs or IDs
  status: mysqlEnum("status", ["open", "addressed", "resolved", "in_faq"]).default("open").notNull(),
  suggestedResponse: text("suggestedResponse"),
  suggestedFaq: text("suggestedFaq"),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  tags: json("tags").$type<string[]>().$default(() => []),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomerIssue = typeof customerIssues.$inferSelect;

// ─── Web Events (Behavior Tracking) ──────────────────────────────────────────
export const webEvents = mysqlTable("web_events", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  sessionId: varchar("sessionId", { length: 100 }).notNull(),
  eventType: mysqlEnum("eventType", [
    "page_view", "click", "scroll", "form_submit", "video_play",
    "rage_click", "dead_click", "exit", "conversion", "custom"
  ]).notNull(),
  page: varchar("page", { length: 1000 }),
  element: varchar("element", { length: 500 }),
  elementText: varchar("elementText", { length: 500 }),
  xPos: int("xPos"),
  yPos: int("yPos"),
  scrollDepth: int("scrollDepth"),              // 0-100 percent
  timeOnPage: int("timeOnPage"),                // seconds
  referrer: varchar("referrer", { length: 1000 }),
  userAgent: varchar("userAgent", { length: 500 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WebEvent = typeof webEvents.$inferSelect;

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  sessionId: varchar("sessionId", { length: 100 }).notNull().unique(),
  startPage: varchar("startPage", { length: 1000 }),
  exitPage: varchar("exitPage", { length: 1000 }),
  pageViews: int("pageViews").default(0).notNull(),
  duration: int("duration"),                    // seconds
  scrollDepthAvg: decimal("scrollDepthAvg", { precision: 5, scale: 2 }),
  converted: boolean("converted").default(false).notNull(),
  bounced: boolean("bounced").default(false).notNull(),
  deviceType: mysqlEnum("deviceType", ["desktop", "mobile", "tablet", "unknown"]).default("unknown").notNull(),
  country: varchar("country", { length: 100 }),
  path: json("path").$type<string[]>().$default(() => []),  // page sequence
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Session = typeof sessions.$inferSelect;

// ─── Behavior Insights ────────────────────────────────────────────────────────
export const behaviorInsights = mysqlTable("behavior_insights", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  insightType: mysqlEnum("insightType", [
    "drop_off", "friction_point", "rage_click_zone", "dead_click_zone",
    "scroll_depth_issue", "cta_performance", "path_analysis", "ux_issue"
  ]).notNull(),
  page: varchar("page", { length: 1000 }),
  element: varchar("element", { length: 500 }),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low"]).default("medium").notNull(),
  description: text("description").notNull(),
  dataPoints: int("dataPoints").default(0).notNull(),  // how many events contributed
  recommendation: text("recommendation"),
  status: mysqlEnum("status", ["new", "acknowledged", "fixed", "dismissed"]).default("new").notNull(),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BehaviorInsight = typeof behaviorInsights.$inferSelect;

// ─── Predictions ──────────────────────────────────────────────────────────────
export const predictions = mysqlTable("predictions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  predictionType: mysqlEnum("predictionType", [
    "trend_detection", "anomaly_detection", "fatigue_detection",
    "conversion_drop", "funnel_issue", "opportunity_signal", "churn_risk"
  ]).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),  // 0-1
  urgency: mysqlEnum("urgency", ["immediate", "high", "medium", "low"]).default("medium").notNull(),
  expectedImpact: text("expectedImpact"),
  supportingData: json("supportingData").$type<Record<string, unknown>>(),
  suggestedAction: text("suggestedAction"),
  status: mysqlEnum("status", ["active", "acknowledged", "resolved", "expired"]).default("active").notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Prediction = typeof predictions.$inferSelect;

// ─── Decisions (Structured Decision Objects) ─────────────────────────────────
export const decisions = mysqlTable("decisions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  decisionType: mysqlEnum("decisionType", [
    "strategy", "campaign", "content", "budget", "channel",
    "creative", "audience", "seo", "optimization"
  ]).notNull(),
  recommendation: text("recommendation").notNull(),
  reason: text("reason").notNull(),
  sourceAgents: json("sourceAgents").$type<string[]>().$default(() => []),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  urgency: mysqlEnum("urgency", ["immediate", "high", "medium", "low"]).default("medium").notNull(),
  expectedImpact: json("expectedImpact").$type<{ metric: string; change: string; timeframe: string }[]>().$default(() => []),
  alternatives: json("alternatives").$type<Array<{ option: string; tradeoff: string }>>().$default(() => []),
  supportingMetrics: json("supportingMetrics").$type<Record<string, unknown>>(),
  deliberationId: int("deliberationId"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "edited", "deferred"]).default("pending").notNull(),
  humanNotes: text("humanNotes"),
  approvedAt: timestamp("approvedAt"),
  rejectedAt: timestamp("rejectedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Decision = typeof decisions.$inferSelect;

// ─── Strategy Versions ────────────────────────────────────────────────────────
export const strategyVersions = mysqlTable("strategy_versions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  strategyId: int("strategyId").notNull(),
  version: int("version").notNull(),
  snapshotData: json("snapshotData").$type<Record<string, unknown>>().notNull(),
  changeLog: json("changeLog").$type<Array<{ field: string; oldValue: unknown; newValue: unknown; changedBy: string }>>().$default(() => []),
  changedBy: varchar("changedBy", { length: 255 }).default("system").notNull(),
  changeReason: text("changeReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StrategyVersion = typeof strategyVersions.$inferSelect;

// ─── External Ideas (Learning Page) ──────────────────────────────────────────
export const externalIdeas = mysqlTable("external_ideas", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId"),            // null = global
  title: varchar("title", { length: 500 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  sourceType: mysqlEnum("sourceType", ["github_repo", "article", "tool", "workflow", "doc", "example", "plugin", "other"]).default("other").notNull(),
  rawContent: text("rawContent"),
  summary: text("summary"),
  usefulnessScore: decimal("usefulnessScore", { precision: 5, scale: 2 }),  // 0-10
  whereToUse: text("whereToUse"),
  complexity: mysqlEnum("complexity", ["low", "medium", "high"]).default("medium").notNull(),
  risks: json("risks").$type<string[]>().$default(() => []),
  aiSuggestion: mysqlEnum("aiSuggestion", ["accept", "reject", "defer"]).default("defer"),
  aiReasoning: text("aiReasoning"),
  status: mysqlEnum("status", ["pending_review", "approved", "rejected", "deferred", "implemented"]).default("pending_review").notNull(),
  humanDecision: mysqlEnum("humanDecision", ["approved", "rejected", "deferred"]),
  implementationPlan: json("implementationPlan").$type<Array<{ step: number; description: string }>>().$default(() => []),
  addedBy: varchar("addedBy", { length: 255 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ExternalIdea = typeof externalIdeas.$inferSelect;

// ─── Skills Registry ──────────────────────────────────────────────────────────
export const skillsRegistry = mysqlTable("skills_registry", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["seo", "social_listening", "analytics", "content", "crm", "reporting", "ux", "ads", "automation", "other"]).notNull(),
  description: text("description"),
  sourceUrl: varchar("sourceUrl", { length: 1000 }),
  implementationType: mysqlEnum("implementationType", ["api", "npm_package", "python_tool", "manual", "webhook", "other"]).default("api").notNull(),
  compatibilityNotes: text("compatibilityNotes"),
  valueScore: decimal("valueScore", { precision: 5, scale: 2 }),       // 0-10 AI assessed value
  complexityScore: decimal("complexityScore", { precision: 5, scale: 2 }), // 0-10
  status: mysqlEnum("status", ["discovered", "under_review", "approved", "rejected", "integrated", "deprecated"]).default("discovered").notNull(),
  aiReview: json("aiReview").$type<Record<string, unknown>>(),
  humanApproval: boolean("humanApproval").default(false),
  integrationPlan: json("integrationPlan").$type<Array<{ step: number; description: string }>>().$default(() => []),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SkillRegistryItem = typeof skillsRegistry.$inferSelect;

// ─── Brain Memory (Hybrid Retrieval Store) ───────────────────────────────────
// Separate from companyMemory (brand/audience/guidelines).
// Stores orchestration-layer memories: decisions, learnings, execution receipts,
// agent interactions, research summaries — queryable by scope + confidence.
export const brainMemory = mysqlTable("brain_memory", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  scope: mysqlEnum("scope", [
    "company", "decision", "learning", "research", "execution", "agent_interaction"
  ]).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: json("value").notNull(),
  confidence: float("confidence").default(0.5).notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BrainMemoryRecord = typeof brainMemory.$inferSelect;

// ─── Execution Logs (Receipt Store) ──────────────────────────────────────────
export const executionLogs = mysqlTable("execution_logs", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  proposalId: int("proposalId"),
  taskId: varchar("taskId", { length: 255 }).notNull(),
  actionType: varchar("actionType", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["planned", "running", "completed", "failed", "blocked"]).notNull(),
  executor: varchar("executor", { length: 100 }).notNull(),
  externalRef: varchar("externalRef", { length: 255 }),
  summary: text("summary").notNull(),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  executedAt: timestamp("executedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ExecutionLog = typeof executionLogs.$inferSelect;

// ─── Deliberation Sessions ────────────────────────────────────────────────────
export const deliberationSessions = mysqlTable("deliberation_sessions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  topic: varchar("topic", { length: 500 }).notNull(),
  topicType: mysqlEnum("topicType", ["strategy", "campaign", "funnel", "content", "budget", "channel", "creative", "persona", "seo", "general"]).default("strategy").notNull(),
  contextData: json("contextData").$type<Record<string, unknown>>(),
  // Round 1: Independent opinions
  firstPassOpinions: json("firstPassOpinions").$type<Array<{
    agentId: string; agentName: string; role: string;
    opinion: string; recommendation: string; confidence: number;
    concerns: string[]; dataPoints: string[];
  }>>().$default(() => []),
  // Round 2: Cross-informed re-evaluation
  secondPassOpinions: json("secondPassOpinions").$type<Array<{
    agentId: string; agentName: string;
    updatedOpinion: string; changed: boolean; changeReason?: string;
    finalVote: "support" | "oppose" | "abstain"; confidence: number;
  }>>().$default(() => []),
  // Aggregated result
  agreements: json("agreements").$type<string[]>().$default(() => []),
  disagreements: json("disagreements").$type<string[]>().$default(() => []),
  conflictsResolved: json("conflictsResolved").$type<Array<{ conflict: string; resolution: string }>>().$default(() => []),
  finalDecision: text("finalDecision"),
  alternatives: json("alternatives").$type<Array<{ option: string; supportedBy: string[]; tradeoffs: string }>>().$default(() => []),
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 2 }),
  consensusReached: boolean("consensusReached").default(false).notNull(),
  totalAgents: int("totalAgents").default(0).notNull(),
  supportingAgents: int("supportingAgents").default(0).notNull(),
  opposingAgents: int("opposingAgents").default(0).notNull(),
  abstainAgents: int("abstainAgents").default(0).notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed", "awaiting_human"]).default("running").notNull(),
  humanReview: mysqlEnum("humanReview", ["pending", "approved", "revised", "rejected"]).default("pending"),
  humanNotes: text("humanNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DeliberationSession = typeof deliberationSessions.$inferSelect;
