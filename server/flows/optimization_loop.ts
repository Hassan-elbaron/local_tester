/**
 * Optimization Loop Flow
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin orchestration layer: builds a proposal + proposalContext from
 * optimization inputs, then delegates to the existing orchestrator. No new core.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { createProposal } from "../db";
import { runOrchestratedDeliberation } from "../orchestrator";

// ─── Input schema ─────────────────────────────────────────────────────────────
export const OptimizationLoopInputSchema = z.object({
  companyId:          z.number().int().positive(),
  brandName:          z.string().min(1),
  optimizationGoal:   z.string().min(1),
  currentPerformance: z.string().optional(),
  bottlenecks:        z.string().optional(),
  channels:           z.string().optional(),
  audience:           z.string().optional(),
  offer:              z.string().optional(),
  landingPage:        z.string().optional(),
  notes:              z.string().optional(),
});

export type OptimizationLoopInput = z.infer<typeof OptimizationLoopInputSchema>;

// ─── Context builder ──────────────────────────────────────────────────────────
function buildOptimizationContext(input: OptimizationLoopInput): string {
  const lines: string[] = [
    `Generate an optimization plan for the following brand:`,
    ``,
    `Brand: ${input.brandName}`,
    `Optimization Goal: ${input.optimizationGoal}`,
  ];
  if (input.currentPerformance) lines.push(`Current Performance: ${input.currentPerformance}`);
  if (input.bottlenecks)        lines.push(`Bottlenecks: ${input.bottlenecks}`);
  if (input.channels)           lines.push(`Channels: ${input.channels}`);
  if (input.audience)           lines.push(`Audience: ${input.audience}`);
  if (input.offer)              lines.push(`Offer: ${input.offer}`);
  if (input.landingPage)        lines.push(`Landing Page: ${input.landingPage}`);
  if (input.notes)              lines.push(`Notes: ${input.notes}`);

  lines.push(
    ``,
    `Required output:`,
    `- Optimization diagnosis`,
    `- Bottleneck prioritization`,
    `- Experiment recommendations`,
    `- Channel optimization opportunities`,
    `- Conversion improvement opportunities`,
    `- Risk flags`,
    `- Approval / execution recommendation`,
    `- Immediate next optimization actions`,
  );

  return lines.join("\n");
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const optimizationLoopRouter = router({
  run: protectedProcedure
    .input(OptimizationLoopInputSchema)
    .mutation(async ({ input }) => {
      // 1. Create a lightweight proposal so the orchestrator has a real ID
      const proposal = await createProposal({
        companyId:   input.companyId,
        title:       `Optimization — ${input.brandName}: ${input.optimizationGoal}`,
        description: buildOptimizationContext(input),
        type:        "optimization",
        metadata: {
          flow:             "optimization_loop",
          brandName:        input.brandName,
          optimizationGoal: input.optimizationGoal,
          channels:         input.channels,
          bottlenecks:      input.bottlenecks,
        },
      });

      if (!proposal) throw new Error("Failed to create optimization proposal");

      // 2. Build proposalContext string
      const proposalContext = buildOptimizationContext(input);

      // 3. Delegate to orchestrator
      const result = await runOrchestratedDeliberation({
        proposalId:      proposal.id,
        companyId:       input.companyId,
        proposalType:    "optimization",
        proposalContext,
      });

      // 4. Return same shape as all previous flows
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
