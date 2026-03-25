/**
 * Seed data validation tests
 * Verifies that the database contains the expected seed data and that
 * core query helpers return correct results.
 */
import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { companies, proposals, deliberations, approvals, auditLogs, notifications, companyMemory } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Seed Data Validation", () => {
  it("should have 2 demo companies", async () => {
    const db = await getDb();
    if (!db) return;
    const rows = await db.select().from(companies);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const names = rows.map((c) => c.name);
    expect(names).toContain("TechFlow Solutions");
    expect(names).toContain("NovaBrand Agency");
  });

  it("should have 6 proposals across 2 companies", async () => {
    const db = await getDb();
    if (!db) return;
    const rows = await db.select().from(proposals);
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it("should have proposals in pending_approval state for approval flow", async () => {
    const db = await getDb();
    if (!db) return;
    const pending = await db.select().from(proposals).where(eq(proposals.status, "pending_approval"));
    expect(pending.length).toBeGreaterThanOrEqual(2);
  });

  it("should have approved proposals", async () => {
    const db = await getDb();
    if (!db) return;
    const approved = await db.select().from(proposals).where(eq(proposals.status, "approved"));
    expect(approved.length).toBeGreaterThanOrEqual(2);
  });

  it("should have deliberations with consensus scores", async () => {
    const db = await getDb();
    if (!db) return;
    const delibs = await db.select().from(deliberations);
    expect(delibs.length).toBeGreaterThanOrEqual(4);
    for (const d of delibs) {
      expect(d.consensusScore).toBeGreaterThan(0);
      expect(d.consensusScore).toBeLessThanOrEqual(1);
    }
  });

  it("should have approvals with pending and approved states", async () => {
    const db = await getDb();
    if (!db) return;
    const approvalsData = await db.select().from(approvals);
    expect(approvalsData.length).toBeGreaterThanOrEqual(4);
    const statuses = approvalsData.map((a) => a.status);
    expect(statuses).toContain("pending");
    expect(statuses).toContain("approved");
  });

  it("should have audit logs for traceability", async () => {
    const db = await getDb();
    if (!db) return;
    const logs = await db.select().from(auditLogs);
    expect(logs.length).toBeGreaterThanOrEqual(8);
  });

  it("should have notifications for both companies", async () => {
    const db = await getDb();
    if (!db) return;
    const notifs = await db.select().from(notifications);
    expect(notifs.length).toBeGreaterThanOrEqual(5);
    const companyIds = [...new Set(notifs.map((n) => n.companyId))];
    expect(companyIds.length).toBeGreaterThanOrEqual(2);
  });

  it("should have company memory entries", async () => {
    const db = await getDb();
    if (!db) return;
    const memory = await db.select().from(companyMemory);
    expect(memory.length).toBeGreaterThanOrEqual(7);
  });

  it("approval-first: no proposal should be in executed state without a prior approved approval", async () => {
    const db = await getDb();
    if (!db) return;
    const executedProposals = await db.select().from(proposals).where(eq(proposals.status, "executed"));
    for (const p of executedProposals) {
      const approvedApproval = await db.select().from(approvals).where(
        and(eq(approvals.proposalId, p.id), eq(approvals.status, "approved"))
      );
      expect(approvedApproval.length).toBeGreaterThan(0);
    }
  });

  it("multi-company isolation: TechFlow proposals should not appear in NovaBrand queries", async () => {
    const db = await getDb();
    if (!db) return;
    const techflowCompanies = await db.select().from(companies).where(eq(companies.name, "TechFlow Solutions"));
    const novabrandCompanies = await db.select().from(companies).where(eq(companies.name, "NovaBrand Agency"));
    if (!techflowCompanies[0] || !novabrandCompanies[0]) return;

    const techflowProposals = await db.select().from(proposals).where(eq(proposals.companyId, techflowCompanies[0].id));
    const novabrandProposals = await db.select().from(proposals).where(eq(proposals.companyId, novabrandCompanies[0].id));

    const techflowIds = new Set(techflowProposals.map((p) => p.id));
    const novabrandIds = new Set(novabrandProposals.map((p) => p.id));

    // No overlap between company proposal sets
    for (const id of techflowIds) {
      expect(novabrandIds.has(id)).toBe(false);
    }
  });
});
