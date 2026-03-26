/**
 * Brand Audit Flow
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin orchestration layer: builds a proposal + proposalContext from brand
 * inputs, then delegates to the existing orchestrator. No new core logic.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { createProposal } from "../db";
import { runOrchestratedDeliberation } from "../orchestrator";

// ─── Input schema ─────────────────────────────────────────────────────────────
export const BrandAuditInputSchema = z.object({
  companyId:      z.number().int().positive(),
  brandName:      z.string().min(1),
  website:        z.string().optional(),
  industry:       z.string().optional(),
  targetAudience: z.string().optional(),
  notes:          z.string().optional(),
});

export type BrandAuditInput = z.infer<typeof BrandAuditInputSchema>;

// ─── Context builder ──────────────────────────────────────────────────────────
function buildAuditContext(input: BrandAuditInput): string {
  const lines: string[] = [
    `Run a brand audit for the following brand:`,
    ``,
    `Brand: ${input.brandName}`,
  ];
  if (input.website)        lines.push(`Website: ${input.website}`);
  if (input.industry)       lines.push(`Industry: ${input.industry}`);
  if (input.targetAudience) lines.push(`Target Audience: ${input.targetAudience}`);
  if (input.notes)          lines.push(`Notes: ${input.notes}`);

  lines.push(
    ``,
    `Required output:`,
    `- Brand positioning assessment`,
    `- Audience clarity (how well the brand speaks to its target audience)`,
    `- Messaging gaps (what is missing or unclear)`,
    `- Competitor / market observations`,
    `- Top 3 risks`,
    `- Top 3 opportunities`,
    `- Recommended next actions`,
  );

  return lines.join("\n");
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const brandAuditRouter = router({
  run: protectedProcedure
    .input(BrandAuditInputSchema)
    .mutation(async ({ input }) => {
      // 1. Create a lightweight proposal so the orchestrator has a real ID
      const proposal = await createProposal({
        companyId:   input.companyId,
        title:       `Brand Audit — ${input.brandName}`,
        description: buildAuditContext(input),
        type:        "research",
        metadata: {
          flow:           "brand_audit",
          brandName:      input.brandName,
          website:        input.website,
          industry:       input.industry,
          targetAudience: input.targetAudience,
        },
      });

      if (!proposal) throw new Error("Failed to create audit proposal");

      // 2. Build proposalContext string
      const proposalContext = buildAuditContext(input);

      // 3. Delegate to orchestrator
      const result = await runOrchestratedDeliberation({
        proposalId:      proposal.id,
        companyId:       input.companyId,
        proposalType:    "research",
        proposalContext,
      });

      // 4. Return everything the UI needs
      return {
        proposalId:   proposal.id,
        taskId:       result.brainRun?.task?.id ?? null,
        decision:     result.brainRun?.decision   ?? null,
        deliberation: {
          id:                  result.deliberationId,
          finalRecommendation: result.finalRecommendation,
          consensusScore:      result.weightedConsensusScore,
          escalated:           result.escalated,
          selectedAgents:      result.selectedAgents,
          dissentSummary:      result.dissentSummary,
        },
        memoryWrites: result.brainRun?.memoryWrites ?? [],
        execution:    result.brainRun?.execution    ?? null,
        guardBlocked: result.guardBlocked           ?? null,
      };
    }),
});
