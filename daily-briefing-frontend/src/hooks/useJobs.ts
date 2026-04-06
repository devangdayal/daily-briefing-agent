import { useState, useCallback, useEffect } from "react";
import type { RunConfig } from "../utils/types";

const API = "http://localhost:8000";

export interface Job {
  job_id: string;
  job_name: string;
  schedule: string;
  next_run: string | null;
  active: boolean;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/jobs`);
      const data = await res.json();
      setJobs(data);
    } catch {
      /* server may not be up yet */
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const createJob = useCallback(
    async (config: RunConfig) => {
      setLoading(true);
      try {
        const payload = {
          topics: config.topics,
          briefing: config.briefing,
          output: config.output,
          hour: config.schedule.hour,
          minute: config.schedule.minute,
          days_of_week: config.schedule.days_of_week,
          timezone: config.schedule.timezone,
          job_name: config.schedule.job_name,
        };
        const res = await fetch(`${API}/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        await fetchJobs();
        return data;
      } finally {
        setLoading(false);
      }
    },
    [fetchJobs],
  );

  const deleteJob = useCallback(
    async (jobId: string) => {
      await fetch(`${API}/jobs/${jobId}`, { method: "DELETE" });
      await fetchJobs();
    },
    [fetchJobs],
  );

  const runNow = useCallback(async (jobId: string) => {
    await fetch(`${API}/jobs/${jobId}/run-now`, { method: "POST" });
  }, []);

  return { jobs, loading, createJob, deleteJob, runNow, fetchJobs };
}
