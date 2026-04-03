import type { AgentEvent } from "../utils/types";

interface Props {
  events: AgentEvent[];
}

const STEP_CONFIG: Record<
  string,
  {
    icon: string;
    color: string;
    bg: string;
    border: string;
    label: string;
  }
> = {
  run_started: {
    icon: "◎",
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    label: "Run started",
  },
  planner_done: {
    icon: "◈",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    label: "Plan ready",
  },
  search_started: {
    icon: "◉",
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    label: "Searching",
  },
  search_query_done: {
    icon: "·",
    color: "text-teal-500",
    bg: "bg-white",
    border: "border-gray-100",
    label: "Query done",
  },
  llm_started: {
    icon: "◈",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    label: "Summarising",
  },
  search_done: {
    icon: "✦",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    label: "Topic done",
  },
  synthesizer_started: {
    icon: "◈",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    label: "Synthesising",
  },
  synthesizer_done: {
    icon: "✦",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    label: "Sections ready",
  },
  writer_started: {
    icon: "◉",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Writing",
  },
  writer_saved: {
    icon: "✦",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Saved",
  },
  writer_done: {
    icon: "✦",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Done",
  },
  run_completed: {
    icon: "✦",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Complete",
  },
  run_error: {
    icon: "✕",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Error",
  },
};

function getLabel(event: AgentEvent): string {
  switch (event.type) {
    case "planner_done":
      return `${event.topics.length} topics — ${event.topics.join(", ")}`;
    case "search_started":
      return `Searching: ${event.topic}`;
    case "search_query_done":
      return `"${event.query}" — ${event.count} results`;
    case "llm_started":
      return `Summarising: ${event.topic}`;
    case "search_done":
      return `${event.topic} · ${event.articles} articles`;
    case "synthesizer_done":
      return `${event.sections} sections assembled`;
    case "writer_saved":
      return `Saved → ${event.path}`;
    case "run_completed":
      return `Briefing ready · ${event.topics.length} topics`;
    case "run_error":
      return `Error: ${event.message}`;
    default:
      return STEP_CONFIG[event.type]?.label ?? event.type;
  }
}

export function EventFeed({ events }: Props) {
  const filtered = events.filter((e) => e.type !== "heartbeat");

  return (
    <div className="space-y-1">
      {filtered.map((event, i) => {
        const cfg = STEP_CONFIG[event.type];
        const isMinor = event.type === "search_query_done";

        return (
          <div
            key={i}
            className={`
              flex items-center gap-3 rounded-lg border px-3 py-2 text-sm
              ${cfg?.bg ?? "bg-white"} ${cfg?.border ?? "border-gray-100"}
              ${isMinor ? "ml-6" : ""}
            `}
          >
            <span
              className={`w-3 text-center shrink-0 font-medium ${cfg?.color ?? "text-gray-400"}`}
            >
              {cfg?.icon ?? "·"}
            </span>
            <span
              className={`flex-1 ${isMinor ? "text-gray-400" : "text-gray-700"}`}
            >
              {getLabel(event)}
            </span>
            <span className="text-xs font-mono text-gray-300 shrink-0 hidden sm:block">
              {event.type}
            </span>
          </div>
        );
      })}
    </div>
  );
}
