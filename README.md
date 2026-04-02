# Daily Briefing Agent

An agentic AI pipeline that researches your configured topics every day, summarises the web into a clean markdown briefing, and saves it locally — fully free to run.

Built with **LangGraph + Groq (llama-3.3-70b) + DuckDuckGo Search**. Zero cloud cost. No paid APIs except Groq's free tier.

---

## How it works

```
config.yaml
    │
    ▼
┌─────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Planner │────▶│ Search node × N  │────▶│    Synthesizer      │
│  node   │     │ (one per topic)  │     │  (formats sections) │
└─────────┘     │                  │     └──────────┬──────────┘
                │ DDG search       │                │
                │ Groq summary     │                ▼
                └──────────────────┘     ┌─────────────────────┐
                                         │    Writer node      │
                                         │ (executive summary) │
                                         └──────────┬──────────┘
                                                    │
                                         ┌──────────▼──────────┐
                                         │  briefing_YYYY-MM-  │
                                         │      DD.md          │
                                         └─────────────────────┘
```

Each node is a pure Python function. State flows through a typed `BriefingState` dict — every node reads what it needs and writes only what it produces.

---

## Stack

| Layer | Tool | Why |
|---|---|---|
| Agent framework | LangGraph | Industry standard for stateful agent pipelines |
| LLM | Groq — llama-3.3-70b-versatile | Free tier, ~800 tok/s, no credit card |
| Web search | DuckDuckGo (`ddgs`) | Free, no API key |
| Config | YAML | Human-editable, no code changes needed |
| Output | Markdown file | Opens in Obsidian, Notion, VS Code, anything |
| Email | Gmail SMTP (optional) | Python built-in `smtplib`, no SDK |
| Package manager | Poetry | Reproducible environments |

---

## Project structure

```
daily-briefing-agent/
├── agent/
│   ├── __init__.py
│   ├── state.py        # BriefingState — shared data schema
│   ├── tools.py        # web_search, save_briefing, send_email
│   ├── nodes.py        # planner, search, synthesizer, writer
│   └── graph.py        # LangGraph pipeline wiring
├── daily_briefings/    # generated .md files land here (git-ignored)
├── app.py              # CLI entrypoint
├── config.yaml         # edit this — topics, output, tone
├── pyproject.toml
└── .env
```

---

## Quickstart

### 1. Clone and install

```bash
git clone https://github.com/yourname/daily-briefing-agent
cd daily-briefing-agent

poetry install
poetry shell
```

### 2. Get a free Groq API key

Sign up at [console.groq.com](https://console.groq.com) — no credit card, takes 30 seconds.

### 3. Configure

```bash
cp .env.example .env
# Add your GROQ_API_KEY to .env
```

Edit `config.yaml` to set your topics:

```yaml
topics:
  - name: "AI News"
    queries:
      - "AI agents news 2026"
      - "LLM breakthroughs this week"

  - name: "My Industry"
    queries:
      - "fintech trends 2026"
```

### 4. Run

```bash
poetry run python app.py
```

Briefing is saved to `daily_briefings/briefing_YYYY-MM-DD.md`.

---

## Configuration reference

```yaml
topics:
  - name: "Topic display name"
    description: "Optional — documents intent"
    queries:
      - "search query 1"
      - "search query 2"       # comment out to disable

output:
  save_to_file: true
  file_dir: "./daily_briefings"
  send_email: false            # set true + configure Gmail to enable
  email_to: "you@gmail.com"

briefing:
  tone: "professional"         # professional | casual | executive-terse
  max_articles_per_topic: 5
```

### Email setup (optional)

1. Enable 2FA on your Google account
2. Go to `myaccount.google.com` → Security → App Passwords
3. Create an app password
4. Add to `.env`:

```bash
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
GMAIL_TO=you@gmail.com
```

5. Set `send_email: true` in `config.yaml`

---

## Schedule it (run every morning automatically)

```bash
# Open crontab
crontab -e

# Add this line — runs at 7:30am every day
30 7 * * * cd /path/to/daily-briefing-agent && poetry run python app.py
```

---

## Agentic concepts demonstrated

| Concept | Where |
|---|---|
| Tool calling | `tools.py` — search, save, email as plain functions |
| Agent state | `state.py` — typed shared state across all nodes |
| Planning node | `nodes.py` — `planner_node` separates intent from execution |
| Sequential graph | `graph.py` — `planner → search → synthesizer → writer` |
| Soft failure | `tools.py` — search errors return placeholder, never crash |
| Config-driven behaviour | `config.yaml` — topics, tone, output all externalised |

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | From console.groq.com |
| `GMAIL_USER` | No | Gmail address for email delivery |
| `GMAIL_APP_PASSWORD` | No | Gmail app password (not your login password) |
| `GMAIL_TO` | No | Recipient email (defaults to `GMAIL_USER`) |

---

## Roadmap

- [ ] FastAPI streaming backend — watch the agent run live
- [ ] React frontend — browser UI with step-by-step progress
- [ ] Langfuse observability — trace every run, token cost, latency
- [ ] Cron scheduler UI — configure run times without editing crontab
- [ ] Multiple output formats — PDF, Notion, Slack

---

## License

MIT