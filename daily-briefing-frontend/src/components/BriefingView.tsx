import ReactMarkdown from "react-markdown"

interface Props { briefing: string }

export function BriefingView({ briefing }: Props) {
  if (!briefing) return null

  const copy = () => navigator.clipboard.writeText(briefing)

  return (
    <div className="my-8 rounded-2xl border border-gray-200 bg-white overflow-hidden w-full">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Briefing
        </span>
        <button
          onClick={copy}
          className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          Copy
        </button>
      </div>

      {/* Markdown rendered with manual component overrides */}
      <div className="px-8 py-6 space-y-4 ">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-xl font-semibold text-gray-900 mb-4">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-base font-semibold text-gray-800 mt-8 mb-3 pb-2 border-b border-gray-100">
                {children}
              </h2>
            ),
            p: ({ children }) => (
              <p className="text-sm text-gray-600 leading-relaxed">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="space-y-2 my-3">
                {children}
              </ul>
            ),
            li: ({ children }) => (
              <li className="text-sm text-gray-600 leading-relaxed flex gap-2">
                <span className="text-gray-300 shrink-0 mt-0.5">—</span>
                <span>{children}</span>
              </li>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:text-blue-700 hover:underline transition-colors"
              >
                {children}
              </a>
            ),
            strong: ({ children }) => (
              <strong className="font-medium text-gray-800">{children}</strong>
            ),
            hr: () => (
              <hr className="border-gray-100 my-6" />
            ),
            em: ({ children }) => (
              <em className="text-xs text-gray-400 not-italic">{children}</em>
            ),
          }}
        >
          {briefing}
        </ReactMarkdown>
      </div>
    </div>
  )
}