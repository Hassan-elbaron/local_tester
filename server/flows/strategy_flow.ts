/**
 * Strategy Generation Flow
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin orchestration layer: builds a proposal + proposalContext from strategy
 * inputs, then delegates to the existing orchestrator. No new core logic.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { createProposal } from "../db";
import { runOrchestratedDeliberation } from "../orchestrator";

// ─── Input schema ─────────────────────────────────────────────────────────────
export const StrategyFlowInputSchema = z.object({
  companyId:      z.number().int().positive(),
  brandName:      z.string().min(1),
  industry:       z.string().optional(),
  businessGoal:   z.string().min(1),
  targetAudience: z.string().optional(),
  currentOffers:  z.string().optional(),
  channels:       z.string().optional(),
  notes:          z.string().optional(),
});

export type StrategyFlowInput = z.infer<typeof StrategyFlowInputSchema>;

// ─── Context builder ──────────────────────────────────────────────────────────
function buildStrategyContext(input: StrategyFlowInput): string {
  const lines: string[] = [
    `Generate a strategic marketing plan for the following brand:`,
    ``,
    `Brand: ${input.brandName}`,
  ];
  if (input.industry)       lines.push(`Industry: ${input.industry}`);
  lines.push(`Business Goal: ${input.businessGoal}`);
  if (input.targetAudience) lines.push(`Target Audience: ${input.targetAudience}`);
  if (input.currentOffers)  lines.push(`Current Offers: ${input.currentOffers}`);
  if (input.channels)       lines.push(`Channels: ${input.channels}`);
  if (input.notes)          lines.push(`Notes: ${input.notes}`);

  lines.push(
    ``,
    `Required output:`,
    `- Positioning recommendation`,
    `- Target audience priority`,
    `- Core messaging direction`,
    `- Channel strategy`,
    `- Acquisition approach`,
    `- Retention approach`,
    `- Top 3 risks`,
    `- Top 3 opportunities`,
    `- Next 30 / 60 / 90 day strategic actions`,
  );

  return lines.join("\n");
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const strategyFlowRouter = router({
  run: protectedProcedure
    .input(StrategyFlowInputSchema)
    .mutation(async ({ input }) => {
      // 1. Create a lightweight proposal so the orchestrator has a real ID
      const proposal = await createProposal({
        companyId:   input.companyId,
        title:       `Strategy — ${input.brandName}`,
        description: buildStrategyContext(input),
        type:        "strategy",
        metadata: {
          flow:           "strategy_generation",
          brandName:      input.brandName,
          industry:       input.industry,
          businessGoal:   input.businessGoal,
          targetAudience: input.targetAudience,
        },
      });

      if (!proposal) throw new Error("Failed to create strategy proposal");

      // 2. Build proposalContext string
      const proposalContext = buildStrategyContext(input);

      // 3. Delegate to orchestrator
      const result = await runOrchestratedDeliberation({
        proposalId:      proposal.id,
        companyId:       input.companyId,
        proposalType:    "strategy",
        proposalContext,
        executionMetadata: {
          brandName:      input.brandName,
          businessGoal:   input.businessGoal,
          industry:       input.industry,
          channels:       input.channels,
          notes:          input.notes,
        },
      });

      // 4. Return same shape as brandAudit.run
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
