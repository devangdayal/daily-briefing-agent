import { useState, useCallback, useRef } from "react";
import type { AgentEvent, RunConfig, RunStatus } from "../utils/types";

const API = "http://localhost:8000";

export function useAgentStream() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [briefing, setBriefing] = useState<string>("");
  const [runId, setRunId] = useState<string>("");
  const abortRef = useRef<(() => void) | null>(null);
  const statusRef = useRef<RunStatus>("idle");

  const startRun = useCallback(async (config: RunConfig) => {
    abortRef.current?.();
    setStatus("running");
    statusRef.current = "running";
    setEvents([]);
    setBriefing("");

    const response = await fetch(`${API}/run/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config), // ← send full config
    });

    if (!response.body) {
      setStatus("error");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    abortRef.current = () => reader.cancel();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const eventType = eventLine.replace("event:", "").trim();
          const data = JSON.parse(dataLine.replace("data:", "").trim());
          const event = { type: eventType, ...data } as AgentEvent;

          setEvents((prev) => [...prev.slice(-50), event]);

          if (eventType === "run_started") setRunId(data.run_id);
          if (eventType === "run_completed") {
            setBriefing(data.briefing);
            setStatus("completed");
            statusRef.current = "completed";
          }
          if (eventType === "run_error") {
            setStatus("error");
            statusRef.current = "error";
          }
        }
      }
    } catch {
      if (statusRef.current !== "completed") {
        setStatus("error");
        statusRef.current = "error";
      }
    }
  }, []);

  const cancelRun = useCallback(() => {
    abortRef.current?.();
    setStatus("idle");
    statusRef.current = "idle";
  }, []);

  return { status, events, briefing, runId, startRun, cancelRun };
}
