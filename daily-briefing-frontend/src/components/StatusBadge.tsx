import type { RunStatus } from "../utils/types";

interface Props {
  status: RunStatus;
  runId: string;
}

export function StatusBadge({ status, runId }: Props) {
  if (status === "idle") return null;

  const config = {
    running: {
      dot: "bg-amber-400 animate-pulse",
      pill: "bg-amber-50 text-amber-700 border-amber-200",
      label: "Running",
    },
    completed: {
      dot: "bg-emerald-500",
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
      label: "Completed",
    },
    error: {
      dot: "bg-red-500",
      pill: "bg-red-50 text-red-700 border-red-200",
      label: "Error",
    },
  }[status];

  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
      {status === "running" && runId && (
        <span className="font-mono opacity-60">#{runId}</span>
      )}
    </span>
  );
}
