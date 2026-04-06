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

export interface TopicConfig {
  name: string;
  queries: string[];
  description: string;
}

export interface BriefingConfig {
  tone: string;
  max_articles_per_topic: number;
}

export interface OutputConfig {
  save_to_file: boolean;
  file_dir: string;
  send_email: boolean;
  email_to: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  days_of_week: string;
  timezone: string;
  job_name: string;
}

export interface RunConfig {
  topics: TopicConfig[];
  briefing: BriefingConfig;
  output: OutputConfig;
  schedule: ScheduleConfig;
}

export const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

export const DEFAULT_CONFIG: RunConfig = {
  topics: [
    {
      name: "Tech News",
      description: "Latest in technology and AI",
      queries: ["latest AI breakthroughs 2026", "tech industry news this week"],
    },
  ],
  briefing: {
    tone: "professional",
    max_articles_per_topic: 5,
  },
  output: {
    save_to_file: true,
    file_dir: "./daily_briefings",
    send_email: false,
    email_to: "",
  },
  schedule: {
    enabled: false,
    hour: 7,
    minute: 30,
    days_of_week: "mon,tue,wed,thu,fri",
    timezone: "Asia/Kolkata",
    job_name: "Daily Briefing",
  },
};
