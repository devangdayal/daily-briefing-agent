import { useState } from "react";
import { useAgentStream } from "./hooks/useAgentStream";
import { ConfigPanel } from "./components/ConfigPanel";
import { EventFeed } from "./components/EventFeed";
import { BriefingView } from "./components/BriefingView";
import { StatusBadge } from "./components/StatusBadge";
import { DEFAULT_CONFIG } from "./utils/types";
import type { RunConfig } from "./utils/types";

export default function App() {
  const [config, setConfig] = useState<RunConfig>(DEFAULT_CONFIG);
  const { status, events, briefing, runId, startRun, cancelRun } =
    useAgentStream();

  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isError = status === "error";

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

        {/* Config panel */}
        <ConfigPanel
          config={config}
          onChange={setConfig}
          disabled={isRunning}
        />

        {/* Action bar */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={isRunning ? cancelRun : () => startRun(config)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95
              ${
                isRunning
                  ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                  : "bg-gray-900 text-white hover:bg-gray-800 border border-gray-900"
              }
            `}
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

          <StatusBadge status={status} runId={runId} />
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

        {/* Event feed — toggleable */}
        <EventFeed events={events} isRunning={isRunning} />

        {/* Briefing output */}
        {isCompleted && <BriefingView briefing={briefing} />}

        {/* Error */}
        {isError && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            Something went wrong. Check the terminal for details.
          </div>
        )}

        {/* Empty state */}
        {status === "idle" && events.length === 0 && (
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
