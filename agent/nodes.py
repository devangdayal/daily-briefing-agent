# agent/nodes.py
import os
import time
from datetime import datetime
import functools
from groq import Groq

from .state import BriefingState, TopicResult
from .tools import save_briefing, send_email, web_search

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL  = "llama-3.3-70b-versatile"

def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        print(f"[timer] ▶ {fn.__name__} starting...")
        start = time.time()
        result = fn(*args, **kwargs)
        elapsed = round(time.time() - start, 2)
        print(f"[timer] ✓ {fn.__name__} done in {elapsed}s")
        return result
    return wrapper


def _chat(prompt: str, max_tokens: int = 1024) -> str:
    """
    LLM call with timeout and retry.
    Groq free tier: 6,000 tokens/minute — parallel calls can hit this.
    Timeout prevents silent hangs. Retry handles rate limit waits.
    """
    for attempt in range(3):
        try:
            print(f"[llm] Calling Groq (attempt {attempt + 1})...")
            start = time.time()

            response = client.chat.completions.create(
                model=MODEL,
                max_tokens=max_tokens,
                temperature=0.3,
                timeout=25,           # ← never wait more than 25s
                messages=[{"role": "user", "content": prompt}]
            )

            elapsed = round(time.time() - start, 1)
            tokens  = response.usage.total_tokens
            print(f"[llm] Done in {elapsed}s — {tokens} tokens used")
            return response.choices[0].message.content.strip()

        except Exception as e:
            elapsed = round(time.time() - start, 1)
            print(f"[llm] Attempt {attempt + 1} failed after {elapsed}s: {e}")
            if attempt < 2:
                wait = (attempt + 1) * 10   # 10s, then 20s
                print(f"[llm] Waiting {wait}s before retry...")
                time.sleep(wait)

    return "Summary unavailable — LLM call failed after 3 attempts."


# ── Node 1: Planner ───────────────────────────────────────────────────────────

def planner_node(state: BriefingState) -> dict:
    """
    Reads config and initialises the run.

    This node makes NO LLM call — it's pure logic.
    Planning = decide what to do.
    Executing = do it (search nodes).
    Keeping them separate means you can test planning
    without burning API calls.
    """
    cfg    = state["config"]
    topics = cfg.get("topics", [])
    date   = datetime.now().strftime("%Y-%m-%d")

    print(f"\n[planner] Date: {date}")
    print(f"[planner] Topics: {[t['name'] for t in topics]}")

    return {
        "topics": topics,
        "date":   date,
        "events": [f"[planner] {len(topics)} topics planned for {date}"]
    }


# ── Node 2: Search (one per topic, all run in parallel) ───────────────────────
def make_search_node(topic: dict, delay: float = 0.0):
    """
    delay = seconds to wait before calling LLM.
    First topic: 0s delay. Second topic: 15s delay.
    Staggers the Groq calls to avoid hitting rate limit simultaneously.
    """
    def search_node(state: BriefingState) -> dict:
        topic_name = topic["name"]
        queries    = topic["queries"]
        max_res    = (
            state["config"]
            .get("briefing", {})
            .get("max_articles_per_topic", 5)
        )

        print(f"\n[search:{topic_name}] Running {len(queries)} queries...")

        all_results = []
        for query in queries:
            print(f"[search:{topic_name}] Query: '{query}'")
            hits = web_search(query, max_results=max_res)
            all_results.extend(hits)
            print(f"[search:{topic_name}] Got {len(hits)} results")

        # Deduplicate by URL
        seen, unique = set(), []
        for r in all_results:
            if r["url"] not in seen and r["url"]:
                seen.add(r["url"])
                unique.append(r)

        print(f"[search:{topic_name}] {len(unique)} unique articles")

        # Format for LLM
        articles_text = "\n\n".join(
            f"Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['body']}"
            for r in unique[:max_res]
        )

        # Stagger LLM calls — wait before calling if delay set
        if delay > 0:
            print(f"[search:{topic_name}] Waiting {delay}s to stagger Groq calls...")
            time.sleep(delay)

        print(f"[search:{topic_name}] Asking LLM to summarise...")
        summary = _chat(
            prompt=(
                f"You are writing one section of a daily briefing.\n"
                f"Topic: {topic_name}\n"
                f"Date: {state['date']}\n\n"
                f"Search results:\n\n{articles_text}\n\n"
                f"Write 3-5 concise bullet points of the most important "
                f"developments. Rules:\n"
                f"- Start each bullet with '- '\n"
                f"- Be specific: names, numbers, dates\n"
                f"- No filler phrases\n"
                f"- Add source URL after each bullet: (source: url)\n"
                f"- If results are poor quality, say so honestly"
            ),
            max_tokens=600
        )

        print(f"[search:{topic_name}] Summary complete")

        result: TopicResult = {
            "topic_name":  topic_name,
            "queries":     queries,
            "raw_results": unique,
            "summary":     summary
        }

        return {
            "topic_results": [result],
            "events": [f"[search] {topic_name} — {len(unique)} articles"]
        }

    search_node.__name__ = f"search_{topic['name'].replace(' ', '_').lower()}"
    return search_node

# ── Node 3: Synthesizer ───────────────────────────────────────────────────────
@timed
def synthesizer_node(state: BriefingState) -> dict:
    """
    Converts topic_results → markdown sections.
    Returns sections as a list so operator.add appends correctly.
    """
    print(f"\n[synthesizer] Building {len(state['topic_results'])} sections...")

    sections = []
    for r in state["topic_results"]:
        section = f"## {r['topic_name']}\n\n{r['summary']}"
        sections.append(section)
        print(f"[synthesizer] ✓ {r['topic_name']}")

    print(f"[synthesizer] {len(sections)} sections ready")

    return {
        "sections": sections,                                  # ← list, operator.add appends it
        "events":   [f"[synthesizer] {len(sections)} sections assembled"]
    }

# ── Node 4: Writer ────────────────────────────────────────────────────────────
@timed
def writer_node(state: BriefingState) -> dict:
    cfg           = state["config"]
    tone          = cfg.get("briefing", {}).get("tone", "professional")
    sections_list = state.get("sections", [])

    # Debug — print what we actually received
    print(f"\n[writer] Received {len(sections_list)} sections")
    for i, s in enumerate(sections_list):
        print(f"[writer] Section {i+1}: {s[:60]}...")

    if not sections_list:
        print("[writer] ERROR — no sections")
        return {
            "final_briefing": "# Error\n\nNo sections generated.",
            "events": ["[writer] ERROR — no sections"]
        }

    sections = "\n\n---\n\n".join(sections_list)

    print("[writer] Generating executive summary...")
    exec_summary = _chat(
        prompt=(
            f"Write a 2-sentence executive summary of this daily briefing.\n"
            f"Tone: {tone}\n"
            f"Be specific — mention actual names, numbers, or trends.\n"
            f"Do not start with 'Today' or 'This briefing'.\n\n"
            f"{sections}"
        ),
        max_tokens=150
    )

    final = (
        f"# Daily Briefing — {state['date']}\n\n"
        f"**Executive Summary**\n\n"
        f"{exec_summary}\n\n"
        f"---\n\n"
        f"{sections}\n\n"
        f"---\n"
        f"*Generated by Daily Briefing Agent · {MODEL}*\n"
    )

    events = ["[writer] Briefing composed"]
    output = cfg.get("output", {})

    if output.get("save_to_file", True):
        path = save_briefing(final, output.get("file_dir", "./daily_briefings"))
        print(f"[writer] Saved → {path}")
        events.append(f"[writer] Saved → {path}")

    if output.get("send_email", False):
        res = send_email(f"Daily Briefing — {state['date']}", final)
        events.append(f"[writer] Email → {res}")

    print("[writer] All done!")

    return {
        "final_briefing": final,
        "events":         events
    }