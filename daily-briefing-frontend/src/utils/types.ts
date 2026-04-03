export type AgentEvent =
  | { type: "run_started"; run_id: string; time: string }
  | { type: "planner_done"; date: string; topics: string[] }
  | { type: "search_started"; topic: string }
  | { type: "search_query_done"; topic: string; query: string; count: number }
  | { type: "llm_started"; topic: string }
  | { type: "search_done"; topic: string; articles: number; summary: string }
  | { type: "synthesizer_started"; count: number }
  | { type: "synthesizer_done"; sections: number }
  | { type: "writer_started" }
  | { type: "writer_saved"; path: string }
  | { type: "writer_done"; preview: string }
  | {
      type: "run_completed";
      run_id: string;
      topics: string[];
      briefing: string;
    }
  | { type: "run_error"; message: string }
  | { type: "heartbeat"; run_id: string };

export type RunStatus = "idle" | "running" | "completed" | "error";
