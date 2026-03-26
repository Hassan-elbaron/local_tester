import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { useParams } from "wouter";

export default function ExecutionDetailPage() {
  const { currentCompany } = useCompany();
  const { taskId } = useParams<{ taskId: string }>();

  const { data, isLoading, error } = trpc.execution.getExecution.useQuery(
    { companyId: currentCompany?.id ?? 0, taskId: decodeURIComponent(taskId ?? "") },
    { enabled: !!currentCompany && !!taskId },
  );

  if (!currentCompany) return <div className="p-6 text-sm text-muted-foreground">No company selected.</div>;
  if (isLoading)       return <div className="p-6 text-sm">Loading...</div>;
  if (error)           return <div className="p-6 text-sm text-red-500">{error.message}</div>;

  const row = data?.row;

  if (!row) {
    return <div className="p-6 text-sm text-muted-foreground">Execution record not found for taskId: {taskId}</div>;
  }

  const sections = [
    {
      label: "Execution",
      data: {
        id:          row.id,
        taskId:      row.taskId,
        actionType:  row.actionType,
        status:      row.status,
        executor:    row.executor,
        externalRef: row.externalRef,
        summary:     row.summary,
        executedAt:  row.executedAt,
        createdAt:   row.createdAt,
      },
    },
    { label: "Payload", data: row.payload },
    { label: "Summary", data: { summary: row.summary } },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-semibold">Execution Detail</h1>
      <p className="text-xs font-mono text-muted-foreground">{row.taskId}</p>

      {sections.map(({ label, data }) => (
        <div key={label}>
          <h2 className="text-sm font-medium mb-2">{label}</h2>
          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}
