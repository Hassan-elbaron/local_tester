import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";

export default function RunsPage() {
  const { currentCompany } = useCompany();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.execution.getRunHistory.useQuery(
    { companyId: currentCompany?.id ?? 0, limit: 50 },
    { enabled: !!currentCompany },
  );

  if (!currentCompany) return <div className="p-6 text-sm text-muted-foreground">No company selected.</div>;
  if (isLoading)       return <div className="p-6 text-sm">Loading...</div>;
  if (error)           return <div className="p-6 text-sm text-red-500">{error.message}</div>;

  const rows = data?.rows ?? [];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Brain Runs ({rows.length})</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">taskId</th>
                <th className="text-left p-2 font-medium">actionType</th>
                <th className="text-left p-2 font-medium">status</th>
                <th className="text-left p-2 font-medium">executor</th>
                <th className="text-left p-2 font-medium">createdAt</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/40">
                  <td className="p-2 font-mono text-xs max-w-[180px] truncate">{row.taskId}</td>
                  <td className="p-2">{row.actionType}</td>
                  <td className="p-2">
                    <span className={
                      row.status === "completed" ? "text-green-500" :
                      row.status === "failed"    ? "text-red-500"   :
                      row.status === "blocked"   ? "text-yellow-500":
                      "text-muted-foreground"
                    }>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-2">{row.executor ?? "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="p-2">
                    <button
                      className="text-xs px-2 py-1 border rounded hover:bg-muted"
                      onClick={() => navigate(`/runs/${encodeURIComponent(row.taskId)}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
