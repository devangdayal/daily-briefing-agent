import { useState } from "react";
import type { RunConfig, TopicConfig } from "../utils/types";

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

  const updateQuery = (topicIdx: number, queryIdx: number, value: string) => {
    const topics = config.topics.map((t, i) => {
      if (i !== topicIdx) return t;
      const queries = t.queries.map((q, j) => (j === queryIdx ? value : q));
      return { ...t, queries };
    });
    onChange({ ...config, topics });
  };

  const addQuery = (topicIdx: number) => {
    const topics = config.topics.map((t, i) =>
      i === topicIdx ? { ...t, queries: [...t.queries, ""] } : t,
    );
    onChange({ ...config, topics });
  };

  const removeQuery = (topicIdx: number, queryIdx: number) => {
    const topics = config.topics.map((t, i) =>
      i === topicIdx
        ? { ...t, queries: t.queries.filter((_, j) => j !== queryIdx) }
        : t,
    );
    onChange({ ...config, topics });
  };

  const addTopic = () => {
    onChange({
      ...config,
      topics: [...config.topics, { name: "", description: "", queries: [""] }],
    });
  };

  const removeTopic = (i: number) => {
    onChange({
      ...config,
      topics: config.topics.filter((_, idx) => idx !== i),
    });
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header — always visible, toggles panel */}
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">
            Configure topics
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {config.topics.length} topic{config.topics.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span
          className={`text-gray-400 text-sm transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-5">
          {/* Topics */}
          {config.topics.map((topic, ti) => (
            <div
              key={ti}
              className="rounded-lg border border-gray-100 p-4 space-y-3"
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

              {/* Queries */}
              <div className="space-y-2 pl-2">
                {topic.queries.map((q, qi) => (
                  <div key={qi} className="flex items-center gap-2">
                    <span className="text-gray-300 text-xs shrink-0">—</span>
                    <input
                      value={q}
                      onChange={(e) => updateQuery(ti, qi, e.target.value)}
                      placeholder="Search query"
                      disabled={disabled}
                      className="flex-1 text-xs text-gray-600 bg-gray-50 rounded px-2.5 py-1.5 border border-gray-100 focus:outline-none focus:border-gray-300 placeholder-gray-300"
                    />
                    {topic.queries.length > 1 && (
                      <button
                        onClick={() => removeQuery(ti, qi)}
                        disabled={disabled}
                        className="text-gray-300 hover:text-red-400 transition-colors text-xs"
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

          {/* Add topic */}
          <button
            onClick={addTopic}
            disabled={disabled}
            className="w-full py-2 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
          >
            + add topic
          </button>

          {/* Tone selector */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500 shrink-0">Tone</span>
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

          {/* Max articles */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 shrink-0">
              Articles per topic
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
      )}
    </div>
  );
}
