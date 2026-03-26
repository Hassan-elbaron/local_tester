import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useLocation } from "wouter";

const STATUS_CLASSES: Record<string, string> = {
  completed: "text-green-600",
  failed:    "text-red-600",
  blocked:   "text-yellow-600",
};

export default function ExecutionsPage() {
  const { currentCompany } = useCompany();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.execution.executions.useQuery(
    { companyId: currentCompany?.id ?? 0 },
    { enabled: !!currentCompany },
  );

  if (!currentCompany) return <div className="p-6 text-sm text-muted-foreground">No company selected.</div>;
  if (isLoading)       return <div className="p-6 text-sm">Loading...</div>;
  if (error)           return <div className="p-6 text-sm text-red-500">{error.message}</div>;

  const items = data?.items ?? [];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Executions ({items.length})</h1>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No execution records found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">taskId</th>
                <th className="text-left p-2 font-medium">actionType</th>
                <th className="text-left p-2 font-medium">status</th>
                <th className="text-left p-2 font-medium">executor</th>
                <th className="text-left p-2 font-medium">externalRef</th>
                <th className="text-left p-2 font-medium">createdAt</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/40 align-top">
                  <td className="p-2 font-mono text-xs max-w-[160px] truncate">{item.taskId}</td>
                  <td className="p-2 text-xs">{item.actionType}</td>
                  <td className={`p-2 text-xs font-medium ${STATUS_CLASSES[item.status] ?? ""}`}>
                    {item.status}
                  </td>
                  <td className="p-2 text-xs">{item.executor}</td>
                  <td className="p-2 text-xs text-muted-foreground">{item.externalRef ?? "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="p-2">
                    <button
                      className="text-xs px-2 py-1 border rounded hover:bg-muted"
                      onClick={() => navigate(`/executions/${encodeURIComponent(item.taskId)}`)}
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
