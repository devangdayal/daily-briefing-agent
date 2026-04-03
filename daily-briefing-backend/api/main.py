import asyncio
import json
import uuid
from datetime import datetime
from typing import AsyncGenerator

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.graph import build_graph
from agent.state import default_state

app = FastAPI(title="Daily Briefing Agent API")

# Allow React dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory run history — keyed by run_id
# In production you'd use Redis or a DB
run_history: dict[str, dict] = {}


# ── Request / Response models ─────────────────────────────────────────────────

class RunRequest(BaseModel):
    config_path: str = "config.yaml"   # allow overriding config per request


class RunSummary(BaseModel):
    run_id:    str
    date:      str
    status:    str
    topics:    list[str]
    file_path: str | None


# ── SSE helpers ───────────────────────────────────────────────────────────────

def sse_event(event: str, data: dict) -> str:
    """
    Format a single SSE message.
    
    SSE wire format:
        event: search_done
        data: {"topic": "Tech News", "articles": 5}
        
        (blank line terminates the event)
    
    The browser's EventSource API parses this automatically.
    """
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}


@app.get("/runs")
def list_runs():
    """Return all past run summaries — for the history sidebar."""
    return list(run_history.values())


@app.get("/runs/{run_id}")
def get_run(run_id: str):
    """Return a specific run including the full briefing text."""
    if run_id not in run_history:
        return {"error": "Run not found"}
    return run_history[run_id]


@app.post("/run/stream")
async def run_stream(req: RunRequest):
    run_id = str(uuid.uuid4())[:8]
    queue: asyncio.Queue = asyncio.Queue()

    async def event_stream() -> AsyncGenerator[str, None]:

        yield sse_event("run_started", {
            "run_id": run_id,
            "time":   datetime.now().isoformat()
        })

        loop = asyncio.get_event_loop()

        async def run_agent():
            try:
                graph, cfg = await loop.run_in_executor(
                    None, lambda: build_graph(req.config_path)
                )
                state  = default_state(cfg, live_queue=queue)
                result = await loop.run_in_executor(
                    None, lambda: graph.invoke(state)
                )
                await queue.put(("done", result))
            except Exception as e:
                await queue.put(("error", str(e)))

        asyncio.create_task(run_agent())

        # Drain the queue — emit everything as it arrives
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=60.0)
            except asyncio.TimeoutError:
                yield sse_event("run_error", {"message": "Agent timed out"})
                break

            kind = item[0]

            if kind == "event":
                _, event_name, data = item
                yield sse_event(event_name, data)

            elif kind == "error":
                yield sse_event("run_error", {"message": item[1]})
                break

            elif kind == "done":
                result = item[1]
                topics = [t["name"] for t in result.get("topics", [])]

                run_history[run_id] = {
                    "run_id":         run_id,
                    "date":           result.get("date", ""),
                    "status":         "completed",
                    "topics":         topics,
                    # "final_briefing": result.get("final_briefing", ""),
                    "events":         result.get("events", []),
                    "completed_at":   datetime.now().isoformat()
                }

                yield sse_event("run_completed", {
                    "run_id":  run_id,
                    "topics":  topics,
                    "briefing": result.get("final_briefing", "")
                })
                break

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
        }
    )