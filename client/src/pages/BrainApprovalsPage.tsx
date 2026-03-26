import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";

export default function BrainApprovalsPage() {
  const { currentCompany } = useCompany();
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.brainApproval.pendingApprovals.useQuery(
    { companyId: currentCompany?.id ?? 0 },
    { enabled: !!currentCompany },
  );

  const approve = trpc.brainApproval.approve.useMutation({
    onSuccess: () => utils.brainApproval.pendingApprovals.invalidate(),
  });

  const reject = trpc.brainApproval.reject.useMutation({
    onSuccess: () => utils.brainApproval.pendingApprovals.invalidate(),
  });

  if (!currentCompany) return <div className="p-6 text-sm text-muted-foreground">No company selected.</div>;
  if (isLoading)       return <div className="p-6 text-sm">Loading...</div>;
  if (error)           return <div className="p-6 text-sm text-red-500">{error.message}</div>;

  const items = data?.items ?? [];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Pending Brain Approvals ({items.length})</h1>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending approvals.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">taskId</th>
                <th className="text-left p-2 font-medium">recommendation</th>
                <th className="text-left p-2 font-medium">confidence</th>
                <th className="text-left p-2 font-medium">createdAt</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const busy = approve.isPending || reject.isPending;
                return (
                  <tr key={item.id} className="border-b hover:bg-muted/40 align-top">
                    <td className="p-2 font-mono text-xs max-w-[160px] truncate">{item.taskId}</td>
                    <td className="p-2 text-xs max-w-[320px]">{item.recommendation}</td>
                    <td className="p-2 text-xs">
                      {item.confidence != null ? `${(item.confidence * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          disabled={busy}
                          className="text-xs px-2 py-1 border rounded text-green-600 hover:bg-green-50 disabled:opacity-40"
                          onClick={() =>
                            approve.mutate({
                              taskId:     item.taskId,
                              companyId:  currentCompany.id,
                              proposalId: item.proposalId ?? undefined,
                              approvedBy: "human",
                            })
                          }
                        >
                          Approve
                        </button>
                        <button
                          disabled={busy}
                          className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50 disabled:opacity-40"
                          onClick={() =>
                            reject.mutate({
                              taskId:     item.taskId,
                              companyId:  currentCompany.id,
                              proposalId: item.proposalId ?? undefined,
                              approvedBy: "human",
                            })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
