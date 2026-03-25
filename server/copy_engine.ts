/**
 * Copy Engine — Captions, briefs, and ad copy generation
 * Pure generation module. No pipeline state. No CRUD side effects.
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { contentCalendar, companies, masterStrategy, personas } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

async function D() { const d = await getDb(); if (!d) throw new Error("Database not available"); return d; }

function llmText(r: any): string {
  const c = r?.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : JSON.stringify(c ?? "");
}
function parseJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw); } catch { return fallback; }
}

async function buildCopyCtx(companyId: number) {
  const db = await D();
  const [co] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const [strat] = await db.select().from(masterStrategy)
    .where(eq(masterStrategy.companyId, companyId)).orderBy(desc(masterStrategy.version)).limit(1);
  const ps = await db.select().from(personas)
    .where(and(eq(personas.companyId, companyId), eq(personas.status, "approved")));
  return {
    companyName: co?.name ?? "Unknown",
    industry: co?.industry ?? "Unknown",
    toneOfVoice: strat?.toneOfVoice ?? "professional",
    positioning: strat?.positioning ?? "",
    brandMessage: strat?.brandMessage ?? "",
    primaryPersona: ps[0] ?? null,
  };
}

// ─── Single Item Copy ─────────────────────────────────────────────────────────

export async function generateCopyForItem(companyId: number, itemId: number): Promise<{ caption: string; brief: string }> {
  const db = await D();
  const [item] = await db.select().from(contentCalendar)
    .where(and(eq(contentCalendar.id, itemId), eq(contentCalendar.companyId, companyId))).limit(1);
  if (!item) throw new Error("Content item not found");

  const ctx = await buildCopyCtx(companyId);

  const [ccRes, bmRes] = await Promise.all([
    invokeLLM({
      messages: [
        { role: "system", content: "You are the Copy Chief specializing in high-converting social copy. Respond with valid JSON only." },
        { role: "user", content: `Write copy for this ${item.platform} post:
Funnel Stage: ${item.funnelStage ?? "awareness"}
Objective: ${item.objective ?? ""}
Concept: ${item.concept ?? ""}
Company: ${ctx.companyName} (${ctx.industry})
Tone: ${ctx.toneOfVoice}
Brand Message: ${ctx.brandMessage}

JSON: {"caption":"max 150 words, natural emojis, CTA at end","designerBrief":"2-3 sentence visual direction for designer"}
Return ONLY JSON.` },
      ],
      response_format: { type: "json_object" },
    }),
    invokeLLM({
      messages: [
        { role: "system", content: "You are the Brand Messaging Strategist. Respond with valid JSON only." },
        { role: "user", content: `Write a pain-resonant caption for ${item.platform}:
Concept: ${item.concept ?? ""}
Company: ${ctx.companyName} — ${ctx.brandMessage}
Audience pain: ${((ctx.primaryPersona?.painPoints as string[]) ?? [])[0] ?? "general pain point"}
Tone: ${ctx.toneOfVoice}
JSON: {"caption":"..."} Return ONLY JSON.` },
      ],
      response_format: { type: "json_object" },
    }),
  ]);

  const cc = parseJSON<any>(llmText(ccRes), {});
  const bm = parseJSON<any>(llmText(bmRes), {});

  const caption = cc.caption || bm.caption || "";
  const brief = cc.designerBrief || item.brief || "";

  await db.update(contentCalendar)
    .set({ caption, brief, copyStatus: "copywritten", updatedAt: new Date() })
    .where(and(eq(contentCalendar.id, itemId), eq(contentCalendar.companyId, companyId)));

  return { caption, brief };
}

// ─── Bulk Copy ────────────────────────────────────────────────────────────────

export async function bulkGenerateCopy(companyId: number): Promise<number> {
  const db = await D();
  const items = await db.select().from(contentCalendar)
    .where(and(eq(contentCalendar.companyId, companyId), eq(contentCalendar.copyStatus, "briefed")));

  let count = 0;
  for (const item of items.slice(0, 10)) {
    try { await generateCopyForItem(companyId, item.id); count++; } catch { /* continue */ }
  }
  return count;
}

// ─── Ad Copy Variations ───────────────────────────────────────────────────────

export async function generateAdCopyVariations(companyId: number, platform: string, objective: string): Promise<string[]> {
  const ctx = await buildCopyCtx(companyId);
  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are a performance copywriter. Respond with valid JSON only." },
      { role: "user", content: `Write 3 ad copy variations for ${platform}:
Objective: ${objective}
Company: ${ctx.companyName}
Positioning: ${ctx.positioning}
Primary audience pain: ${((ctx.primaryPersona?.painPoints as string[]) ?? [])[0] ?? "general"}
Tone: ${ctx.toneOfVoice}
JSON: {"variations":["copy 1 (headline + body)","copy 2","copy 3"]}
Return ONLY JSON.` },
    ],
    response_format: { type: "json_object" },
  });
  const parsed = parseJSON<any>(llmText(result), {});
  return parsed.variations ?? [];
}
