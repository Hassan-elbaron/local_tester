/**
 * Execution CRUD Layer — Database operations only
 * No AI generation here. For generation, see execution_pipeline.ts
 */
import { getDb } from "./db";
import { funnels, contentCalendar, campaignBuilds } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

async function D() { const d = await getDb(); if (!d) throw new Error("Database not available"); return d; }

// ─── Funnel CRUD ──────────────────────────────────────────────────────────────

export async function getFunnels(companyId: number) {
  const db = await D();
  return db.select().from(funnels).where(eq(funnels.companyId, companyId)).orderBy(desc(funnels.createdAt));
}

export async function updateFunnelStatus(companyId: number, funnelId: number, status: "draft" | "approved") {
  const db = await D();
  await db.update(funnels).set({ status, updatedAt: new Date() })
    .where(and(eq(funnels.id, funnelId), eq(funnels.companyId, companyId)));
}

export async function deleteFunnel(companyId: number, funnelId: number) {
  const db = await D();
  await db.delete(funnels).where(and(eq(funnels.id, funnelId), eq(funnels.companyId, companyId)));
}

// ─── Content CRUD ─────────────────────────────────────────────────────────────

export async function getContentCalendar(companyId: number) {
  const db = await D();
  return db.select().from(contentCalendar)
    .where(eq(contentCalendar.companyId, companyId))
    .orderBy(contentCalendar.week);
}

export async function updateContentItem(companyId: number, itemId: number, data: Partial<typeof contentCalendar.$inferInsert>) {
  const db = await D();
  await db.update(contentCalendar).set({ ...data, updatedAt: new Date() } as any)
    .where(and(eq(contentCalendar.id, itemId), eq(contentCalendar.companyId, companyId)));
}

export async function deleteContentItem(companyId: number, itemId: number) {
  const db = await D();
  await db.delete(contentCalendar)
    .where(and(eq(contentCalendar.id, itemId), eq(contentCalendar.companyId, companyId)));
}

// ─── Campaign CRUD ────────────────────────────────────────────────────────────

export async function getCampaignBuilds(companyId: number) {
  const db = await D();
  return db.select().from(campaignBuilds)
    .where(eq(campaignBuilds.companyId, companyId))
    .orderBy(desc(campaignBuilds.createdAt));
}

export async function updateCampaignStatus(companyId: number, campaignId: number, status: "draft" | "ready" | "launched") {
  const db = await D();
  await db.update(campaignBuilds).set({ status, updatedAt: new Date() })
    .where(and(eq(campaignBuilds.id, campaignId), eq(campaignBuilds.companyId, companyId)));
}

export async function deleteCampaign(companyId: number, campaignId: number) {
  const db = await D();
  await db.delete(campaignBuilds)
    .where(and(eq(campaignBuilds.id, campaignId), eq(campaignBuilds.companyId, companyId)));
}
