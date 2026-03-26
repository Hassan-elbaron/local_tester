import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useLocation } from "wouter";

export default function MemoryPage() {
  const { currentCompany } = useCompany();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.memory.brainList.useQuery(
    { companyId: currentCompany?.id ?? 0 },
    { enabled: !!currentCompany },
  );

  if (!currentCompany) return <div className="p-6 text-sm text-muted-foreground">No company selected.</div>;
  if (isLoading)       return <div className="p-6 text-sm">Loading...</div>;
  if (error)           return <div className="p-6 text-sm text-red-500">{error.message}</div>;

  const items = data?.items ?? [];

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Brain Memory ({items.length})</h1>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No memory records found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">scope</th>
                <th className="text-left p-2 font-medium">key</th>
                <th className="text-left p-2 font-medium">source</th>
                <th className="text-left p-2 font-medium">confidence</th>
                <th className="text-left p-2 font-medium">createdAt</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/40 align-top">
                  <td className="p-2 text-xs">{item.scope}</td>
                  <td className="p-2 text-xs font-mono max-w-[240px] truncate">{item.key}</td>
                  <td className="p-2 text-xs">{item.source}</td>
                  <td className="p-2 text-xs">{item.confidence}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="p-2">
                    <button
                      className="text-xs px-2 py-1 border rounded hover:bg-muted"
                      onClick={() => navigate(`/memory/${encodeURIComponent(item.key)}`)}
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
