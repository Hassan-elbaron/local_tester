/**
 * Approval Router — Control Plane
 * ──────────────────────────────────────────────────────────────────────────────
 * tRPC endpoints for human approval / rejection of pending AI decisions.
 *
 * Flow:
 *   1. runOrchestratedDeliberation() → BrainDecision { status: "pending_approval",
 *        requiresHumanApproval: true, executionAllowed: false }
 *   2. Human reviews decision in UI
 *   3. Human calls brainApproval.approve() or brainApproval.reject()
 *      → persisted to execution_logs for audit
 *   4. Human calls execution.executeApproved() with updated decision flags
 *      (status: "approved", executionAllowed: true, requiresHumanApproval: false)
 *   5. Execution gate passes → adapter fires → receipt returned
 *
 * All mutations are protected — require authenticated session.
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { recordApproval, getLatestApproval } from "./approval_service";

const approvalInputSchema = z.object({
  taskId:     z.string().min(1),
  companyId:  z.number().int().positive(),
  proposalId: z.number().int().positive().optional(),
  approvedBy: z.string().min(1),
  note:       z.string().max(2000).optional(),
});

export const approvalRouter = router({
  /**
   * Approve a pending BrainDecision.
   * Records the approval in the audit ledger.
   * The client must then call execution.executeApproved() separately,
   * passing a decision with { status:"approved", executionAllowed:true,
   * requiresHumanApproval:false }.
   */
  approve: protectedProcedure
    .input(approvalInputSchema)
    .mutation(async ({ input, ctx }) => {
      const actor = ctx.user?.name ?? input.approvedBy;
      const result = await recordApproval({
        taskId:     input.taskId,
        companyId:  input.companyId,
        proposalId: input.proposalId,
        approved:   true,
        approvedBy: actor,
        note:       input.note,
        createdAt:  new Date().toISOString(),
      });

      if (!result.ok) {
        throw new Error(`Approval recording failed: ${result.error}`);
      }

      return {
        status:     "approved" as const,
        taskId:     input.taskId,
        approvedBy: actor,
        timestamp:  new Date().toISOString(),
        message:    "Decision approved. Call executeApproved to proceed with execution.",
      };
    }),

  /**
   * Reject a pending BrainDecision.
   * Records the rejection and prevents any future execution for this taskId.
   */
  reject: protectedProcedure
    .input(approvalInputSchema)
    .mutation(async ({ input, ctx }) => {
      const actor = ctx.user?.name ?? input.approvedBy;
      const result = await recordApproval({
        taskId:     input.taskId,
        companyId:  input.companyId,
        proposalId: input.proposalId,
        approved:   false,
        approvedBy: actor,
        note:       input.note,
        createdAt:  new Date().toISOString(),
      });

      if (!result.ok) {
        throw new Error(`Rejection recording failed: ${result.error}`);
      }

      return {
        status:     "rejected" as const,
        taskId:     input.taskId,
        rejectedBy: actor,
        timestamp:  new Date().toISOString(),
        message:    "Decision rejected. No execution will proceed.",
      };
    }),

  /**
   * Look up the latest approval record for a given taskId.
   * Returns null if no approval exists yet (still pending).
   */
  getStatus: protectedProcedure
    .input(
      z.object({
        companyId: z.number().int().positive(),
        taskId:    z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      const record = await getLatestApproval(input.companyId, input.taskId);
      if (!record) {
        return { status: "pending" as const, taskId: input.taskId, record: null };
      }
      return {
        status:   record.approved ? ("approved" as const) : ("rejected" as const),
        taskId:   input.taskId,
        record,
      };
    }),
});
