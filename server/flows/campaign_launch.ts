/**
 * Campaign Launch Flow
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin orchestration layer: builds a proposal + proposalContext from campaign
 * inputs, then delegates to the existing orchestrator. No new core logic.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { createProposal } from "../db";
import { runOrchestratedDeliberation } from "../orchestrator";

// ─── Input schema ─────────────────────────────────────────────────────────────
export const CampaignLaunchInputSchema = z.object({
  companyId:    z.number().int().positive(),
  brandName:    z.string().min(1),
  campaignGoal: z.string().min(1),
  offer:        z.string().optional(),
  audience:     z.string().optional(),
  channels:     z.string().optional(),
  budget:       z.string().optional(),
  timeline:     z.string().optional(),
  landingPage:  z.string().optional(),
  notes:        z.string().optional(),
});

export type CampaignLaunchInput = z.infer<typeof CampaignLaunchInputSchema>;

// ─── Context builder ──────────────────────────────────────────────────────────
function buildCampaignContext(input: CampaignLaunchInput): string {
  const lines: string[] = [
    `Plan and prepare a campaign launch for the following brand:`,
    ``,
    `Brand: ${input.brandName}`,
    `Campaign Goal: ${input.campaignGoal}`,
  ];
  if (input.offer)       lines.push(`Offer: ${input.offer}`);
  if (input.audience)    lines.push(`Audience: ${input.audience}`);
  if (input.channels)    lines.push(`Channels: ${input.channels}`);
  if (input.budget)      lines.push(`Budget: ${input.budget}`);
  if (input.timeline)    lines.push(`Timeline: ${input.timeline}`);
  if (input.landingPage) lines.push(`Landing Page: ${input.landingPage}`);
  if (input.notes)       lines.push(`Notes: ${input.notes}`);

  lines.push(
    ``,
    `Required output:`,
    `- Campaign objective framing`,
    `- Audience targeting recommendation`,
    `- Channel mix recommendation`,
    `- Budget allocation logic`,
    `- Messaging direction`,
    `- Launch structure`,
    `- Risk flags`,
    `- Approval / execution recommendation`,
    `- Immediate next launch actions`,
  );

  return lines.join("\n");
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const campaignLaunchRouter = router({
  run: protectedProcedure
    .input(CampaignLaunchInputSchema)
    .mutation(async ({ input }) => {
      // 1. Create a lightweight proposal so the orchestrator has a real ID
      const proposal = await createProposal({
        companyId:   input.companyId,
        title:       `Campaign — ${input.brandName}: ${input.campaignGoal}`,
        description: buildCampaignContext(input),
        type:        "campaign",
        metadata: {
          flow:         "campaign_launch",
          brandName:    input.brandName,
          campaignGoal: input.campaignGoal,
          channels:     input.channels,
          budget:       input.budget,
          timeline:     input.timeline,
        },
      });

      if (!proposal) throw new Error("Failed to create campaign proposal");

      // 2. Build proposalContext string
      const proposalContext = buildCampaignContext(input);

      // 3. Delegate to orchestrator
      const result = await runOrchestratedDeliberation({
        proposalId:      proposal.id,
        companyId:       input.companyId,
        proposalType:    "campaign",
        proposalContext,
      });

      // 4. Return same shape as brandAudit.run and strategyFlow.run
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
