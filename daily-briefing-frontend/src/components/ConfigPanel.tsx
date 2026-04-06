import { useState } from "react";
import type { RunConfig, TopicConfig } from "../utils/types";
import { TIMEZONES } from "../utils/types";

interface Props {
  config: RunConfig;
  onChange: (config: RunConfig) => void;
  disabled: boolean;
}

export function ConfigPanel({ config, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  const updateTopic = (
    i: number,
    field: keyof TopicConfig,
    value: string | string[],
  ) => {
    const topics = config.topics.map((t, idx) =>
      idx === i ? { ...t, [field]: value } : t,
    );
    onChange({ ...config, topics });
  };

  const updateQuery = (ti: number, qi: number, value: string) => {
    const topics = config.topics.map((t, i) => {
      if (i !== ti) return t;
      return { ...t, queries: t.queries.map((q, j) => (j === qi ? value : q)) };
    });
    onChange({ ...config, topics });
  };

  const addQuery = (ti: number) => {
    const topics = config.topics.map((t, i) =>
      i === ti ? { ...t, queries: [...t.queries, ""] } : t,
    );
    onChange({ ...config, topics });
  };

  const removeQuery = (ti: number, qi: number) => {
    const topics = config.topics.map((t, i) =>
      i === ti ? { ...t, queries: t.queries.filter((_, j) => j !== qi) } : t,
    );
    onChange({ ...config, topics });
  };

  const addTopic = () =>
    onChange({
      ...config,
      topics: [...config.topics, { name: "", description: "", queries: [""] }],
    });

  const removeTopic = (i: number) =>
    onChange({
      ...config,
      topics: config.topics.filter((_, idx) => idx !== i),
    });

  const inputClass =
    "w-full text-xs text-gray-600 bg-gray-50 rounded px-2.5 py-1.5 border border-gray-100 focus:outline-none focus:border-gray-300 placeholder-gray-300";

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">Configure</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {config.topics.length} topic{config.topics.length !== 1 ? "s" : ""}
          </span>
          {config.output.send_email && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              email on
            </span>
          )}
          {config.schedule.enabled && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              scheduled
            </span>
          )}
        </div>
        <span
          className={`text-gray-400 text-sm transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-6">
          {/* ── Topics ── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Topics
            </p>
            {config.topics.map((topic, ti) => (
              <div
                key={ti}
                className="rounded-lg border border-gray-100 p-3.5 space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={topic.name}
                    onChange={(e) => updateTopic(ti, "name", e.target.value)}
                    placeholder="Topic name"
                    disabled={disabled}
                    className="flex-1 text-sm font-medium bg-transparent border-0 border-b border-gray-200 pb-1 focus:outline-none focus:border-gray-400 text-gray-800 placeholder-gray-300"
                  />
                  {config.topics.length > 1 && (
                    <button
                      onClick={() => removeTopic(ti)}
                      disabled={disabled}
                      className="text-gray-300 hover:text-red-400 transition-colors text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 pl-2">
                  {topic.queries.map((q, qi) => (
                    <div key={qi} className="flex items-center gap-2">
                      <span className="text-gray-300 text-xs shrink-0">—</span>
                      <input
                        value={q}
                        onChange={(e) => updateQuery(ti, qi, e.target.value)}
                        placeholder="Search query"
                        disabled={disabled}
                        className={inputClass}
                      />
                      {topic.queries.length > 1 && (
                        <button
                          onClick={() => removeQuery(ti, qi)}
                          disabled={disabled}
                          className="text-gray-300 hover:text-red-400 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addQuery(ti)}
                    disabled={disabled}
                    className="text-xs text-gray-400 hover:text-gray-600 ml-4 transition-colors"
                  >
                    + add query
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addTopic}
              disabled={disabled}
              className="w-full py-2 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
            >
              + add topic
            </button>
          </div>

          {/* ── Briefing settings ── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Briefing
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24 shrink-0">Tone</span>
              <div className="flex gap-2">
                {["professional", "casual", "executive-terse"].map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      onChange({
                        ...config,
                        briefing: { ...config.briefing, tone: t },
                      })
                    }
                    disabled={disabled}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      config.briefing.tone === t
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-24 shrink-0">
                Articles
              </span>
              <div className="flex gap-1">
                {[3, 5, 8, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() =>
                      onChange({
                        ...config,
                        briefing: {
                          ...config.briefing,
                          max_articles_per_topic: n,
                        },
                      })
                    }
                    disabled={disabled}
                    className={`w-8 h-7 rounded text-xs transition-colors ${
                      config.briefing.max_articles_per_topic === n
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Email delivery ── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Email delivery
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Send briefing by email
              </span>
              <button
                onClick={() =>
                  onChange({
                    ...config,
                    output: {
                      ...config.output,
                      send_email: !config.output.send_email,
                    },
                  })
                }
                disabled={disabled}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  config.output.send_email ? "bg-gray-900" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
                    config.output.send_email ? "left-4" : "left-0.5"
                  }`}
                />
              </button>
            </div>
            {config.output.send_email && (
              <input
                value={config.output.email_to}
                onChange={(e) =>
                  onChange({
                    ...config,
                    output: { ...config.output, email_to: e.target.value },
                  })
                }
                placeholder="recipient@email.com"
                disabled={disabled}
                className={inputClass}
              />
            )}
            {config.output.send_email && !config.output.email_to && (
              <p className="text-xs text-amber-600">
                Add GMAIL_USER + GMAIL_APP_PASSWORD to your .env to enable email
              </p>
            )}
          </div>

          {/* ── Schedule ── */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Schedule
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Run automatically on a schedule
              </span>
              <button
                onClick={() =>
                  onChange({
                    ...config,
                    schedule: {
                      ...config.schedule,
                      enabled: !config.schedule.enabled,
                    },
                  })
                }
                disabled={disabled}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  config.schedule.enabled ? "bg-gray-900" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
                    config.schedule.enabled ? "left-4" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {config.schedule.enabled && (
              <div className="space-y-2.5 rounded-lg border border-gray-100 p-3.5">
                {/* Job name */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">
                    Job name
                  </span>
                  <input
                    value={config.schedule.job_name}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        schedule: {
                          ...config.schedule,
                          job_name: e.target.value,
                        },
                      })
                    }
                    disabled={disabled}
                    className={inputClass}
                  />
                </div>

                {/* Time */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">
                    Run at
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={config.schedule.hour}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          schedule: {
                            ...config.schedule,
                            hour: Number(e.target.value),
                          },
                        })
                      }
                      disabled={disabled}
                      className="w-14 text-xs text-center bg-gray-50 border border-gray-100 rounded px-2 py-1.5 focus:outline-none focus:border-gray-300"
                    />
                    <span className="text-xs text-gray-400">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={config.schedule.minute}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          schedule: {
                            ...config.schedule,
                            minute: Number(e.target.value),
                          },
                        })
                      }
                      disabled={disabled}
                      className="w-14 text-xs text-center bg-gray-50 border border-gray-100 rounded px-2 py-1.5 focus:outline-none focus:border-gray-300"
                    />
                  </div>
                </div>

                {/* Days */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">
                    Days
                  </span>
                  <div className="flex gap-1">
                    {[
                      { label: "M", value: "mon" },
                      { label: "T", value: "tue" },
                      { label: "W", value: "wed" },
                      { label: "T", value: "thu" },
                      { label: "F", value: "fri" },
                      { label: "S", value: "sat" },
                      { label: "S", value: "sun" },
                    ].map(({ label, value }) => {
                      const days =
                        config.schedule.days_of_week === "*"
                          ? ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
                          : config.schedule.days_of_week.split(",");
                      const active = days.includes(value);
                      const toggleDay = () => {
                        const next = active
                          ? days.filter((d) => d !== value)
                          : [...days, value];
                        onChange({
                          ...config,
                          schedule: {
                            ...config.schedule,
                            days_of_week:
                              next.length === 7 ? "*" : next.join(","),
                          },
                        });
                      };
                      return (
                        <button
                          key={value}
                          onClick={toggleDay}
                          disabled={disabled}
                          className={`w-7 h-7 rounded-full text-xs transition-colors ${
                            active
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Timezone */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">
                    Timezone
                  </span>
                  <select
                    value={config.schedule.timezone}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        schedule: {
                          ...config.schedule,
                          timezone: e.target.value,
                        },
                      })
                    }
                    disabled={disabled}
                    className="flex-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2.5 py-1.5 focus:outline-none focus:border-gray-300"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
