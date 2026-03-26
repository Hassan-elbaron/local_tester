/**
 * Content Calendar Flow
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin orchestration layer: builds a proposal + proposalContext from content
 * calendar inputs, then delegates to the existing orchestrator. No new core.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { createProposal } from "../db";
import { runOrchestratedDeliberation } from "../orchestrator";

// ─── Input schema ─────────────────────────────────────────────────────────────
export const ContentCalendarInputSchema = z.object({
  companyId:        z.number().int().positive(),
  brandName:        z.string().min(1),
  contentGoal:      z.string().min(1),
  audience:         z.string().optional(),
  channels:         z.string().optional(),
  contentPillars:   z.string().optional(),
  postingFrequency: z.string().optional(),
  campaignContext:  z.string().optional(),
  offers:           z.string().optional(),
  notes:            z.string().optional(),
});

export type ContentCalendarInput = z.infer<typeof ContentCalendarInputSchema>;

// ─── Context builder ──────────────────────────────────────────────────────────
function buildContentContext(input: ContentCalendarInput): string {
  const lines: string[] = [
    `Generate a content calendar plan for the following brand:`,
    ``,
    `Brand: ${input.brandName}`,
    `Content Goal: ${input.contentGoal}`,
  ];
  if (input.audience)         lines.push(`Audience: ${input.audience}`);
  if (input.channels)         lines.push(`Channels: ${input.channels}`);
  if (input.contentPillars)   lines.push(`Content Pillars: ${input.contentPillars}`);
  if (input.postingFrequency) lines.push(`Posting Frequency: ${input.postingFrequency}`);
  if (input.campaignContext)  lines.push(`Campaign Context: ${input.campaignContext}`);
  if (input.offers)           lines.push(`Offers: ${input.offers}`);
  if (input.notes)            lines.push(`Notes: ${input.notes}`);

  lines.push(
    ``,
    `Required output:`,
    `- Content strategy direction`,
    `- Pillar prioritization`,
    `- Channel-specific content recommendations`,
    `- Posting cadence recommendation`,
    `- Content themes for the upcoming period`,
    `- Messaging direction`,
    `- Execution risks`,
    `- Approval / execution recommendation`,
    `- Immediate next content actions`,
  );

  return lines.join("\n");
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const contentCalendarRouter = router({
  run: protectedProcedure
    .input(ContentCalendarInputSchema)
    .mutation(async ({ input }) => {
      // 1. Create a lightweight proposal so the orchestrator has a real ID
      const proposal = await createProposal({
        companyId:   input.companyId,
        title:       `Content Calendar — ${input.brandName}: ${input.contentGoal}`,
        description: buildContentContext(input),
        type:        "content",
        metadata: {
          flow:             "content_calendar",
          brandName:        input.brandName,
          contentGoal:      input.contentGoal,
          channels:         input.channels,
          contentPillars:   input.contentPillars,
          postingFrequency: input.postingFrequency,
        },
      });

      if (!proposal) throw new Error("Failed to create content calendar proposal");

      // 2. Build proposalContext string
      const proposalContext = buildContentContext(input);

      // 3. Delegate to orchestrator
      const result = await runOrchestratedDeliberation({
        proposalId:      proposal.id,
        companyId:       input.companyId,
        proposalType:    "content",
        proposalContext,
      });

      // 4. Return same shape as brandAudit.run / strategyFlow.run / campaignLaunch.run
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
