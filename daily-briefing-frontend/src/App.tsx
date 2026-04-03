import { useAgentStream } from "./hooks/useAgentStream";
import { EventFeed } from "./components/EventFeed";
import { BriefingView } from "./components/BriefingView";
import { StatusBadge } from "./components/StatusBadge";

export default function App() {
  const { status, events, briefing, runId, startRun, cancelRun } =
    useAgentStream();

  const isRunning = status === "running";
  const isCompleted = status === "completed";
  const isError = status === "error";

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      <div className="w-full max-w-3/4 mx-auto px-5 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md bg-gray-900 flex items-center justify-center">
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

        {/* Action bar */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={isRunning ? cancelRun : startRun}
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
              onClick={startRun}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
            >
              Run again
            </button>
          )}

          <StatusBadge status={status} runId={runId} />
        </div>

        {/* Stats strip — shown when running or complete */}
        {(isRunning || isCompleted) && events.length > 0 && (
          <div className="flex gap-4 mb-6">
            {[
              {
                label: "Topics",
                value: events.find((e) => e.type === "planner_done")
                  ? (events.find((e) => e.type === "planner_done") as any)
                      .topics.length
                  : "—",
              },
              {
                label: "Articles",
                value:
                  events
                    .filter((e) => e.type === "search_done")
                    .reduce((sum, e: any) => sum + e.articles, 0) || "—",
              },
              {
                label: "Steps",
                value: events.filter((e) => e.type !== "heartbeat").length,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex-1"
              >
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-xl font-semibold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Briefing */}
        {isCompleted && <BriefingView briefing={briefing} />}
        
        {/* Event feed */}
        {events.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Agent steps
            </p>
            <EventFeed events={events} />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            Something went wrong. Check the terminal for details.
          </div>
        )}

        {/* Empty state */}
        {status === "idle" && (
          <div className="mt-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📰</span>
            </div>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              Click generate to research your configured topics and produce a
              clean briefing
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
