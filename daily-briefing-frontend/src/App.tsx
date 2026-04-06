import { useState } from "react";
import { useAgentStream } from "./hooks/useAgentStream";
import { useJobs } from "./hooks/useJobs";
import { ConfigPanel } from "./components/ConfigPanel";
import { EventFeed } from "./components/EventFeed";
import { BriefingView } from "./components/BriefingView";
import { StatusBadge } from "./components/StatusBadge";
import { DEFAULT_CONFIG } from "./utils/types";
import type { RunConfig } from "./utils/types";
import { JobsPanel } from "./components/JobPanel";

export default function App() {
  const [config, setConfig] = useState<RunConfig>(DEFAULT_CONFIG);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState("");

  const { status, events, briefing, runId, startRun, cancelRun } =
    useAgentStream();
  const { jobs, createJob, deleteJob, runNow, fetchJobs } = useJobs();

  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isError = status === "error";

  const handleSchedule = async () => {
    if (!config.schedule.enabled) return;
    setScheduling(true);
    try {
      const result = await createJob(config);
      setScheduleMsg(
        `Scheduled! Next run: ${
          result.next_run
            ? new Date(result.next_run).toLocaleString()
            : "pending"
        }`,
      );
      setTimeout(() => setScheduleMsg(""), 4000);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="max-w-2xl mx-auto px-5 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-gray-900 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              Daily Briefing
            </h1>
          </div>
          <p className="text-sm text-gray-400 ml-8">
            LangGraph · Groq llama-3.3-70b · DuckDuckGo
          </p>
        </div>

        {/* Scheduled jobs */}
        <JobsPanel
          jobs={jobs}
          onDelete={deleteJob}
          onRunNow={runNow}
          onRefresh={fetchJobs}
        />

        {/* Config panel */}
        <ConfigPanel
          config={config}
          onChange={setConfig}
          disabled={isRunning}
        />

        {/* Action bar */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <button
            onClick={isRunning ? cancelRun : () => startRun(config)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              isRunning
                ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                : "bg-gray-900 text-white hover:bg-gray-800 border border-gray-900"
            }`}
          >
            {isRunning ? "Cancel" : "Generate briefing"}
          </button>

          {isCompleted && (
            <button
              onClick={() => startRun(config)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
            >
              Run again
            </button>
          )}

          {/* Schedule button — only shown when schedule is enabled in config */}
          {config.schedule.enabled && (
            <button
              onClick={handleSchedule}
              disabled={scheduling || isRunning}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 transition-all active:scale-95 disabled:opacity-50"
            >
              {scheduling ? "Scheduling..." : "Save schedule"}
            </button>
          )}

          <StatusBadge status={status} runId={runId} />

          {scheduleMsg && (
            <span className="text-xs text-emerald-600">{scheduleMsg}</span>
          )}
        </div>

        {/* Stats strip */}
        {(isRunning || isCompleted) && events.length > 0 && (
          <div className="flex gap-3 mb-6">
            {[
              {
                label: "Topics",
                value: (() => {
                  const e = events.find((e) => e.type === "planner_done");
                  return e && e.type === "planner_done" ? e.topics.length : "—";
                })(),
              },
              {
                label: "Articles",
                value:
                  events
                    .filter((e) => e.type === "search_done")
                    .reduce(
                      (s, e) => s + (e.type === "search_done" ? e.articles : 0),
                      0,
                    ) || "—",
              },
              {
                label: "Steps",
                value: events.filter((e) => e.type !== "heartbeat").length,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex-1 text-center"
              >
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-xl font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Event feed */}
        <EventFeed events={events} isRunning={isRunning} />

        {/* Briefing */}
        {isCompleted && <BriefingView briefing={briefing} />}

        {/* Error */}
        {isError && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            Something went wrong. Check the terminal for details.
          </div>
        )}

        {/* Empty state */}
        {status === "idle" && events.length === 0 && jobs.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-400">
              Configure your topics above, then click generate
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
