import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useParams } from "wouter";

export default function MemoryDetailPage() {
  const { currentCompany } = useCompany();
  const { key } = useParams<{ key: string }>();

  const { data, isLoading, error } = trpc.memory.brainGet.useQuery(
    { companyId: currentCompany?.id ?? 0, key: decodeURIComponent(key ?? "") },
    { enabled: !!currentCompany && !!key },
  );

  if (!currentCompany) return <div className="p-6 text-sm text-muted-foreground">No company selected.</div>;
  if (isLoading)       return <div className="p-6 text-sm">Loading...</div>;
  if (error)           return <div className="p-6 text-sm text-red-500">{error.message}</div>;

  const row = data?.row;

  if (!row) {
    return <div className="p-6 text-sm text-muted-foreground">Memory record not found for key: {key}</div>;
  }

  const display = {
    Scope:      row.scope,
    Key:        row.key,
    Source:     row.source,
    Confidence: row.confidence,
    Value:      row.value,
    CreatedAt:  row.createdAt,
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-semibold">Memory Detail</h1>
      <p className="text-xs font-mono text-muted-foreground">{row.key}</p>

      <pre className="text-xs bg-muted p-4 rounded overflow-x-auto whitespace-pre-wrap break-words">
        {JSON.stringify(display, null, 2)}
      </pre>
    </div>
  );
}
