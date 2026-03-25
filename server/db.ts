import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  agentOpinions,
  approvals,
  auditLogs,
  chatMessages,
  companies,
  companyFiles,
  companyMemory,
  decisionTrace,
  deliberations,
  executionPreviews,
  externalResearchRequests,
  notifications,
  proposalOptions,
  proposals,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Companies ────────────────────────────────────────────────────────────────
export async function getAllCompanies() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companies).where(eq(companies.isActive, true)).orderBy(desc(companies.createdAt));
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result[0];
}

export async function createCompany(data: {
  name: string; nameAr?: string; industry?: string; website?: string;
  description?: string; descriptionAr?: string; primaryColor?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companies).values(data);
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  return getCompanyById(Number(id));
}

export async function updateCompany(id: number, data: Partial<typeof companies.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set(data).where(eq(companies.id, id));
  return getCompanyById(id);
}

// ─── Company Memory ───────────────────────────────────────────────────────────
export async function getCompanyMemory(companyId: number, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(companyMemory.companyId, companyId)];
  if (category) conditions.push(eq(companyMemory.category, category as any));
  return db.select().from(companyMemory).where(and(...conditions)).orderBy(desc(companyMemory.updatedAt));
}

export async function searchCompanyMemory(companyId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companyMemory)
    .where(and(
      eq(companyMemory.companyId, companyId),
      or(
        like(companyMemory.key, `%${query}%`),
      )
    ))
    .orderBy(desc(companyMemory.updatedAt))
    .limit(20);
}

export async function upsertCompanyMemory(
  companyId: number, key: string, value: unknown, category: string,
  options?: { importance?: number; source?: string; sourceRef?: string; tags?: string[] }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(companyMemory)
    .where(and(eq(companyMemory.companyId, companyId), eq(companyMemory.key, key))).limit(1);
  const extra = {
    importance: options?.importance ?? 3,
    source: (options?.source ?? "manual") as any,
    sourceRef: options?.sourceRef ?? null,
    tags: (options?.tags ?? []) as any,
  };
  if (existing.length > 0) {
    await db.update(companyMemory).set({ value: value as any, category: category as any, ...extra })
      .where(and(eq(companyMemory.companyId, companyId), eq(companyMemory.key, key)));
  } else {
    await db.insert(companyMemory).values({ companyId, key, value: value as any, category: category as any, ...extra });
  }
}

// ─── Company Files ────────────────────────────────────────────────────────────
export async function createCompanyFile(data: {
  companyId: number; fileName: string; fileKey: string; fileUrl: string;
  mimeType: string; fileSize: number; category?: string; description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companyFiles).values({
    ...data, category: (data.category ?? "other") as any, extractionStatus: "pending",
  });
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  return getCompanyFileById(Number(id));
}

export async function getCompanyFileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companyFiles).where(eq(companyFiles.id, id)).limit(1);
  return result[0];
}

export async function getCompanyFiles(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companyFiles)
    .where(eq(companyFiles.companyId, companyId))
    .orderBy(desc(companyFiles.createdAt));
}

export async function updateCompanyFile(id: number, data: Partial<typeof companyFiles.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companyFiles).set(data).where(eq(companyFiles.id, id));
  return getCompanyFileById(id);
}

// ─── Proposals ────────────────────────────────────────────────────────────────
export async function getProposalsByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(proposals).where(eq(proposals.companyId, companyId)).orderBy(desc(proposals.createdAt));
}

export async function getProposalById(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(proposals)
    .where(and(eq(proposals.id, id), eq(proposals.companyId, companyId))).limit(1);
  return result[0];
}

export async function createProposal(data: {
  companyId: number; title: string; titleAr?: string; description?: string;
  descriptionAr?: string; type: string; budget?: number; currency?: string;
  timeline?: string; channels?: string[]; recommendation?: string;
  recommendationAr?: string; alternatives?: string[]; risks?: string[];
  expectedOutcomes?: string[]; metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(proposals).values({
    ...data, type: data.type as any, status: "draft",
    channels: data.channels as any, alternatives: data.alternatives as any,
    risks: data.risks as any, expectedOutcomes: data.expectedOutcomes as any,
    metadata: data.metadata as any,
  });
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  return getProposalById(Number(id), data.companyId);
}

export async function updateProposalStatus(id: number, companyId: number, status: string, extra?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(proposals).set({ status: status as any, ...(extra ?? {}) })
    .where(and(eq(proposals.id, id), eq(proposals.companyId, companyId)));
  return getProposalById(id, companyId);
}

// ─── Proposal Options ─────────────────────────────────────────────────────────
export async function createProposalOption(data: {
  proposalId: number; companyId: number; deliberationId?: number;
  optionIndex: number; title: string; titleAr?: string;
  description: string; descriptionAr?: string;
  scores: { feasibility: number; roi: number; risk: number; speed: number; brandFit: number; overall: number };
  pros?: string[]; cons?: string[]; estimatedBudget?: number;
  estimatedTimeline?: string; channels?: string[];
  isRecommended?: boolean; whyRecommended?: string; whyOthersRejected?: string;
  agentVotes?: Array<{ agentRole: string; votedFor: boolean; reason: string }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(proposalOptions).values({
    ...data,
    scores: data.scores as any,
    pros: (data.pros ?? []) as any,
    cons: (data.cons ?? []) as any,
    channels: (data.channels ?? []) as any,
    agentVotes: (data.agentVotes ?? []) as any,
  });
}

export async function getProposalOptions(proposalId: number, companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(proposalOptions)
    .where(and(eq(proposalOptions.proposalId, proposalId), eq(proposalOptions.companyId, companyId)))
    .orderBy(proposalOptions.optionIndex);
}

// ─── Decision Trace ───────────────────────────────────────────────────────────
export async function createDecisionTrace(data: {
  proposalId: number; companyId: number; deliberationId?: number;
  problemStatement?: string; contextUsed?: Record<string, unknown>;
  optionsGenerated?: number; evaluationCriteria?: string[];
  agentConsensus?: Record<string, unknown>;
  finalDecision?: string; finalDecisionAr?: string;
  decisionRationale?: string; decisionRationaleAr?: string;
  rejectedAlternatives?: Array<{ title: string; reason: string }>;
  keyInsights?: string[]; keyInsightsAr?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(decisionTrace).values({
    ...data,
    contextUsed: data.contextUsed as any,
    evaluationCriteria: (data.evaluationCriteria ?? []) as any,
    agentConsensus: data.agentConsensus as any,
    rejectedAlternatives: (data.rejectedAlternatives ?? []) as any,
    keyInsights: (data.keyInsights ?? []) as any,
    keyInsightsAr: (data.keyInsightsAr ?? []) as any,
  });
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  return getDecisionTraceByProposal(data.proposalId, data.companyId);
}

export async function getDecisionTraceByProposal(proposalId: number, companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(decisionTrace)
    .where(and(eq(decisionTrace.proposalId, proposalId), eq(decisionTrace.companyId, companyId)))
    .orderBy(desc(decisionTrace.createdAt)).limit(1);
  return result[0];
}

export async function updateDecisionTrace(id: number, data: Partial<typeof decisionTrace.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(decisionTrace).set(data).where(eq(decisionTrace.id, id));
}

// ─── Deliberations ────────────────────────────────────────────────────────────
export async function createDeliberation(data: {
  proposalId: number; companyId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(deliberations).values({ ...data, status: "in_progress" });
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  return getDeliberationById(Number(id));
}

export async function getDeliberationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(deliberations).where(eq(deliberations.id, id)).limit(1);
  return result[0];
}

export async function getDeliberationByProposal(proposalId: number, companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(deliberations)
    .where(and(eq(deliberations.proposalId, proposalId), eq(deliberations.companyId, companyId)))
    .orderBy(desc(deliberations.createdAt)).limit(1);
  return result[0];
}

export async function updateDeliberation(id: number, data: Partial<typeof deliberations.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(deliberations).set(data).where(eq(deliberations.id, id));
  return getDeliberationById(id);
}

export async function saveAgentOpinion(data: {
  deliberationId: number; companyId: number; round: number;
  agentRole: string; agentName: string; opinion: string; opinionAr?: string;
  recommendation?: string; confidence: number; concerns?: string[];
  suggestions?: string[]; votedFor?: boolean; preferredOptionIndex?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(agentOpinions).values({
    ...data, concerns: data.concerns as any, suggestions: data.suggestions as any,
    votedFor: data.votedFor ?? true,
  });
}

export async function getAgentOpinionsByDeliberation(deliberationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentOpinions)
    .where(eq(agentOpinions.deliberationId, deliberationId))
    .orderBy(agentOpinions.round, agentOpinions.agentRole);
}

// ─── Approvals ────────────────────────────────────────────────────────────────
export async function createApproval(data: {
  proposalId: number; companyId: number; deliberationId?: number;
  recommendation?: string; recommendationAr?: string; risks?: string[];
  consensusScore?: number; version?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(approvals).values({
    ...data, status: "pending", version: data.version ?? 1,
    risks: data.risks as any,
  });
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  return getApprovalById(Number(id));
}

export async function getApprovalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
  return result[0];
}

export async function getPendingApprovals(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: approvals.id,
    proposalId: approvals.proposalId,
    companyId: approvals.companyId,
    deliberationId: approvals.deliberationId,
    status: approvals.status,
    version: approvals.version,
    recommendation: approvals.recommendation,
    consensusScore: approvals.consensusScore,
    approvedBy: approvals.approvedBy,
    approvalReason: approvals.approvalReason,
    rejectionReason: approvals.rejectionReason,
    revisionNotes: approvals.revisionNotes,
    approvedAt: approvals.approvedAt,
    rejectedAt: approvals.rejectedAt,
    createdAt: approvals.createdAt,
    updatedAt: approvals.updatedAt,
    proposalTitle: proposals.title,
    proposalTitleAr: proposals.titleAr,
    proposalType: proposals.type,
  }).from(approvals)
    .leftJoin(proposals, eq(approvals.proposalId, proposals.id))
    .where(and(eq(approvals.companyId, companyId), eq(approvals.status, "pending")))
    .orderBy(desc(approvals.createdAt));
  return rows;
}

export async function getApprovalsByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: approvals.id,
    proposalId: approvals.proposalId,
    companyId: approvals.companyId,
    deliberationId: approvals.deliberationId,
    status: approvals.status,
    version: approvals.version,
    recommendation: approvals.recommendation,
    consensusScore: approvals.consensusScore,
    approvedBy: approvals.approvedBy,
    approvalReason: approvals.approvalReason,
    rejectionReason: approvals.rejectionReason,
    revisionNotes: approvals.revisionNotes,
    approvedAt: approvals.approvedAt,
    rejectedAt: approvals.rejectedAt,
    createdAt: approvals.createdAt,
    updatedAt: approvals.updatedAt,
    proposalTitle: proposals.title,
    proposalTitleAr: proposals.titleAr,
    proposalType: proposals.type,
  }).from(approvals)
    .leftJoin(proposals, eq(approvals.proposalId, proposals.id))
    .where(eq(approvals.companyId, companyId))
    .orderBy(desc(approvals.createdAt));
  return rows;
}

export async function approveDecision(id: number, approvedBy: string, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(approvals).set({
    status: "approved", approvedBy, approvalReason: reason ?? null, approvedAt: new Date(),
  }).where(eq(approvals.id, id));
  return getApprovalById(id);
}

export async function rejectDecision(id: number, approvedBy: string, reason: string, alternativeSuggestions?: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(approvals).set({
    status: "rejected", approvedBy, rejectionReason: reason,
    rejectedAt: new Date(),
    alternativeSuggestions: (alternativeSuggestions ?? []) as any,
  }).where(eq(approvals.id, id));
  return getApprovalById(id);
}

export async function requestRevision(id: number, notes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(approvals).set({ status: "revised", revisionNotes: notes }).where(eq(approvals.id, id));
  return getApprovalById(id);
}

// ─── Execution Previews ───────────────────────────────────────────────────────
export async function createExecutionPreview(data: {
  proposalId: number; companyId: number; approvalId: number;
  campaignStructure?: Record<string, unknown>;
  adPreviews?: Array<Record<string, unknown>>;
  executionSteps?: Array<Record<string, unknown>>;
  changeLog?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(executionPreviews).values({
    ...data,
    campaignStructure: data.campaignStructure as any,
    adPreviews: (data.adPreviews ?? []) as any,
    executionSteps: (data.executionSteps ?? []) as any,
    changeLog: data.changeLog as any,
    status: "draft",
  });
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  return getExecutionPreviewById(Number(id));
}

export async function getExecutionPreviewById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(executionPreviews).where(eq(executionPreviews.id, id)).limit(1);
  return result[0];
}

export async function getExecutionPreviewByProposal(proposalId: number, companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(executionPreviews)
    .where(and(eq(executionPreviews.proposalId, proposalId), eq(executionPreviews.companyId, companyId)))
    .orderBy(desc(executionPreviews.generatedAt)).limit(1);
  return result[0];
}

export async function approveExecutionPreview(id: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(executionPreviews).set({
    humanPreviewApproved: true,
    humanPreviewApprovedAt: new Date(),
    humanPreviewNotes: notes ?? null,
    status: "approved",
  }).where(eq(executionPreviews.id, id));
  return getExecutionPreviewById(id);
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export async function createAuditLog(data: {
  companyId: number; entityType: string; entityId?: number;
  action: string; actor: string; summary: string; summaryAr?: string;
  before?: Record<string, unknown>; after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    ...data, entityType: data.entityType as any,
    before: data.before as any, after: data.after as any, metadata: data.metadata as any,
  });
}

export async function getAuditLogs(companyId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditLogs)
    .where(eq(auditLogs.companyId, companyId))
    .orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function createNotification(data: {
  companyId: number; type: string; title: string; titleAr?: string;
  message: string; messageAr?: string; entityType?: string; entityId?: number;
  priority?: string; actionUrl?: string; metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({
    ...data, type: data.type as any,
    priority: (data.priority ?? "medium") as any,
    metadata: data.metadata as any,
  });
}

export async function getNotifications(companyId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(notifications.companyId, companyId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));
  return db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(id: number, companyId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.companyId, companyId)));
}

export async function markAllNotificationsRead(companyId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.companyId, companyId), eq(notifications.isRead, false)));
}

export async function getUnreadNotificationCount(companyId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(notifications)
    .where(and(eq(notifications.companyId, companyId), eq(notifications.isRead, false)));
  return result.length;
}

// ─── Chat Messages ────────────────────────────────────────────────────────────
export async function saveChatMessage(data: {
  companyId: number; role: "user" | "assistant" | "system";
  content: string; contentAr?: string; agentRole?: string;
  commandType?: string;
  relatedEntityType?: string; relatedEntityId?: number;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(chatMessages).values({
    ...data,
    commandType: (data.commandType ?? "chat") as any,
    metadata: data.metadata as any,
  });
}

export async function getChatHistory(companyId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.companyId, companyId))
    .orderBy(desc(chatMessages.createdAt)).limit(limit);
}

export async function getApprovalByProposal(proposalId: number, companyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(approvals)
    .where(and(eq(approvals.proposalId, proposalId), eq(approvals.companyId, companyId)))
    .orderBy(desc(approvals.createdAt)).limit(1);
  return result[0];
}

// ─── External Research Requests ───────────────────────────────────────────────
export async function createExternalResearchRequest(data: {
  companyId: number;
  searchTargets: string[];
  dataSources: string[];
  researchGoal: string;
  researchGoalAr?: string;
  frequency: "one_time" | "weekly" | "monthly";
  requestedBy: string;
  estimatedDataSize?: string;
  privacyNote?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(externalResearchRequests).values({
    ...data,
    searchTargets: data.searchTargets as any,
    dataSources: data.dataSources as any,
    status: "pending_approval",
  });
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  const rows = await db.select().from(externalResearchRequests).where(eq(externalResearchRequests.id, id)).limit(1);
  return rows[0];
}

export async function getExternalResearchRequests(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(externalResearchRequests)
    .where(eq(externalResearchRequests.companyId, companyId))
    .orderBy(desc(externalResearchRequests.createdAt));
}

export async function getExternalResearchRequest(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(externalResearchRequests).where(eq(externalResearchRequests.id, id)).limit(1);
  return rows[0];
}

export async function updateExternalResearchRequest(id: number, data: Partial<typeof externalResearchRequests.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(externalResearchRequests).set(data).where(eq(externalResearchRequests.id, id));
}
