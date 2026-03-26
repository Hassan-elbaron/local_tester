import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";

function Section({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold mb-1">{title}</h2>
      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
        {value == null ? "null" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export default function RunDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { currentCompany } = useCompany();
  const [, navigate] = useLocation();

  const decodedTaskId = decodeURIComponent(taskId ?? "");

  const { data, isLoading, error } = trpc.execution.getRun.useQuery(
    { companyId: currentCompany?.id ?? 0, taskId: decodedTaskId },
    { enabled: !!currentCompany && !!decodedTaskId },
  );

  if (!currentCompany) return <div className="p-6 text-sm text-muted-foreground">No company selected.</div>;
  if (isLoading)       return <div className="p-6 text-sm">Loading...</div>;
  if (error)           return <div className="p-6 text-sm text-red-500">{error.message}</div>;

  const row = data?.row;
  const run = row?.run;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          className="text-xs px-2 py-1 border rounded hover:bg-muted"
          onClick={() => navigate("/runs")}
        >
          ← Back
        </button>
        <h1 className="text-sm font-semibold font-mono truncate">{decodedTaskId}</h1>
        {row && (
          <span className={
            row.status === "completed" ? "text-green-500 text-xs" :
            row.status === "failed"    ? "text-red-500 text-xs"   :
            row.status === "blocked"   ? "text-yellow-500 text-xs":
            "text-xs text-muted-foreground"
          }>
            {row.status}
          </span>
        )}
      </div>

      {!row ? (
        <p className="text-sm text-muted-foreground">Run not found.</p>
      ) : (
        <>
          <Section title="Task"         value={run?.task         ?? null} />
          <Section title="Decision"     value={run?.decision     ?? null} />
          <Section title="Execution"    value={run?.execution    ?? null} />
          <Section title="MemoryWrites" value={run?.memoryWrites ?? null} />
        </>
      )}
    </div>
  );
}
