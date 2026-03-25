/**
 * Learning Engine — External Ideas + Skills Registry
 * Users submit URLs/ideas → AI reviews → Human approves → System implements
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { externalIdeas, skillsRegistry } from "../drizzle/schema";
import { eq, desc, and, isNull, or } from "drizzle-orm";

async function D() {
  const d = await getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ─── External Ideas ────────────────────────────────────────────────────────────

export async function getExternalIdeas(companyId?: number) {
  const db = await D();
  const cond = companyId
    ? or(eq(externalIdeas.companyId, companyId), isNull(externalIdeas.companyId))
    : isNull(externalIdeas.companyId);
  return db.select().from(externalIdeas).where(cond!).orderBy(desc(externalIdeas.createdAt));
}

export async function addExternalIdea(data: {
  companyId?: number;
  title: string;
  sourceUrl?: string;
  sourceType: "github_repo" | "article" | "tool" | "workflow" | "doc" | "example" | "plugin" | "other";
  rawContent?: string;
  addedBy: string;
}): Promise<number> {
  const db = await D();

  // Run AI review immediately
  const reviewResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are the AI Learning System. Evaluate this idea/resource and determine its value for a Local-First AI Marketing platform.",
      },
      {
        role: "user",
        content: `Title: ${data.title}\nURL: ${data.sourceUrl ?? "not provided"}\nType: ${data.sourceType}\nContent:\n${data.rawContent ?? "(URL only, no content extracted)"}\n\nEvaluate this resource. Respond as JSON:\n{\n  "summary": "2-3 sentence summary of what this is",\n  "usefulnessScore": 0-10,\n  "whereToUse": "where in the system this would be applicable",\n  "complexity": "low|medium|high",\n  "risks": ["risk1", "risk2"],\n  "aiSuggestion": "accept|reject|defer",\n  "aiReasoning": "why you recommend accept/reject/defer",\n  "implementationPlan": [{ "step": 1, "description": "..." }]\n}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = reviewResult.choices[0]?.message?.content;
  const review = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

  const insertResult = await db.insert(externalIdeas).values({
    companyId: data.companyId ?? null,
    title: data.title,
    sourceUrl: data.sourceUrl ?? null,
    sourceType: data.sourceType,
    rawContent: data.rawContent ?? null,
    summary: review.summary ?? null,
    usefulnessScore: review.usefulnessScore ? String(review.usefulnessScore) as any : null,
    whereToUse: review.whereToUse ?? null,
    complexity: review.complexity ?? "medium",
    risks: review.risks ?? [],
    aiSuggestion: review.aiSuggestion ?? "defer",
    aiReasoning: review.aiReasoning ?? null,
    implementationPlan: review.implementationPlan ?? [],
    addedBy: data.addedBy,
    status: "pending_review",
  });

  return (insertResult as any)[0]?.insertId ?? (insertResult as any).insertId;
}

export async function reviewIdea(ideaId: number, decision: "approved" | "rejected" | "deferred", companyId?: number) {
  const db = await D();
  const cond = companyId
    ? and(eq(externalIdeas.id, ideaId), or(eq(externalIdeas.companyId, companyId), isNull(externalIdeas.companyId)))
    : eq(externalIdeas.id, ideaId);
  await db.update(externalIdeas).set({
    humanDecision: decision,
    status: decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "deferred",
    updatedAt: new Date(),
  }).where(cond!);
}

export async function markIdeaImplemented(ideaId: number) {
  const db = await D();
  await db.update(externalIdeas).set({ status: "implemented", updatedAt: new Date() })
    .where(eq(externalIdeas.id, ideaId));
}

// ─── Skills Registry ──────────────────────────────────────────────────────────

export async function getSkills(status?: string) {
  const db = await D();
  const cond = status ? eq(skillsRegistry.status, status as any) : undefined;
  return db.select().from(skillsRegistry).where(cond).orderBy(desc(skillsRegistry.createdAt));
}

export async function discoverSkill(data: {
  name: string;
  category: "seo" | "social_listening" | "analytics" | "content" | "crm" | "reporting" | "ux" | "ads" | "automation" | "other";
  description?: string;
  sourceUrl?: string;
  implementationType?: "api" | "npm_package" | "python_tool" | "manual" | "webhook" | "other";
}): Promise<number> {
  const db = await D();

  // AI reviews the skill
  const reviewResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are the System Architecture AI. Evaluate this skill/plugin for integration into a Local-First AI Marketing platform built with Node.js, TypeScript, React, MySQL.",
      },
      {
        role: "user",
        content: `Skill: ${data.name}\nCategory: ${data.category}\nDescription: ${data.description ?? "not provided"}\nURL: ${data.sourceUrl ?? "not provided"}\nType: ${data.implementationType ?? "api"}\n\nEvaluate this skill. Respond as JSON:\n{\n  "valueScore": 0-10,\n  "complexityScore": 0-10,\n  "compatibilityNotes": "how compatible with our Node.js/TypeScript stack",\n  "review": {\n    "pros": ["pro1", "pro2"],\n    "cons": ["con1"],\n    "recommendation": "accept|reject|defer",\n    "integrationNotes": "how to integrate"\n  },\n  "integrationPlan": [{ "step": 1, "description": "..." }]\n}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = reviewResult.choices[0]?.message?.content;
  const review = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

  const insertResult = await db.insert(skillsRegistry).values({
    name: data.name,
    category: data.category,
    description: data.description ?? null,
    sourceUrl: data.sourceUrl ?? null,
    implementationType: data.implementationType ?? "api",
    compatibilityNotes: review.compatibilityNotes ?? null,
    valueScore: review.valueScore ? String(review.valueScore) as any : null,
    complexityScore: review.complexityScore ? String(review.complexityScore) as any : null,
    aiReview: review.review ?? {},
    integrationPlan: review.integrationPlan ?? [],
    status: "under_review",
  });

  return (insertResult as any)[0]?.insertId ?? (insertResult as any).insertId;
}

export async function approveSkill(skillId: number) {
  const db = await D();
  await db.update(skillsRegistry).set({
    status: "approved",
    humanApproval: true,
    updatedAt: new Date(),
  }).where(eq(skillsRegistry.id, skillId));
}

export async function rejectSkill(skillId: number) {
  const db = await D();
  await db.update(skillsRegistry).set({
    status: "rejected",
    humanApproval: false,
    updatedAt: new Date(),
  }).where(eq(skillsRegistry.id, skillId));
}

export async function markSkillIntegrated(skillId: number) {
  const db = await D();
  await db.update(skillsRegistry).set({ status: "integrated", updatedAt: new Date() })
    .where(eq(skillsRegistry.id, skillId));
}

export async function scanForNewSkills(): Promise<number> {
  // AI discovers recommended skills for the platform
  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are a platform architect. Suggest useful skills/tools/APIs for a Local-First AI Marketing platform." },
      { role: "user", content: "Suggest 5 tools/APIs that would be valuable for an AI Marketing OS. Respond as JSON:\n{\n  \"skills\": [\n    { \"name\": \"...\", \"category\": \"seo|social_listening|analytics|content|crm|reporting|ux|ads|automation|other\", \"description\": \"...\", \"sourceUrl\": \"...\", \"implementationType\": \"api|npm_package|python_tool|manual|webhook|other\" }\n  ]\n}" },
    ],
    response_format: { type: "json_object" },
  });

  const raw = result.choices[0]?.message?.content;
  const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
  const skills = (parsed.skills ?? []) as any[];

  for (const skill of skills) {
    await discoverSkill(skill);
  }

  return skills.length;
}
