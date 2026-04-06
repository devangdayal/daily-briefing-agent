import { useEffect } from "react";
import type { Job } from "../hooks/useJobs";

interface JobPanelProps {
  jobs: Job[];
  onDelete: (id: string) => void;
  onRunNow: (id: string) => void;
  onRefresh: () => void;
}

export function JobsPanel({ jobs, onDelete, onRunNow, onRefresh }: JobPanelProps) {
  useEffect(() => {
    const t = setInterval(onRefresh, 30_000); // refresh next_run every 30s
    return () => clearInterval(t);
  }, [onRefresh]);

  if (jobs.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">
            Scheduled jobs
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {jobs.length}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {jobs.map((job) => (
          <div
            key={job.job_id}
            className="flex items-center justify-between px-5 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-sm text-gray-800 font-medium truncate">
                  {job.job_name}
                </span>
              </div>
              <p className="text-xs text-gray-400 ml-3.5">{job.schedule}</p>
              {job.next_run && (
                <p className="text-xs text-gray-400 ml-3.5">
                  Next: {new Date(job.next_run).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={() => onRunNow(job.job_id)}
                className="text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Run now
              </button>
              <button
                onClick={() => onDelete(job.job_id)}
                className="text-xs text-red-400 hover:text-red-600 px-2.5 py-1 rounded-lg border border-red-100 hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
