# api/main.py
import asyncio
import json
import queue
import uuid
from datetime import datetime
from typing import AsyncGenerator, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.graph import build_graph_from_config
from agent.state import default_state

app = FastAPI(title="Daily Briefing Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

run_history: dict[str, dict] = {}


# ── Request models ─────────────────────────────────────────────────────────────

class TopicConfig(BaseModel):
    name:        str
    queries:     list[str]
    description: Optional[str] = ""

class BriefingConfig(BaseModel):
    tone:                    str = "professional"
    max_articles_per_topic:  int = 5

class OutputConfig(BaseModel):
    save_to_file: bool = True
    file_dir:     str  = "./daily_briefings"
    send_email:   bool = False
    email_to:     str  = ""

class RunRequest(BaseModel):
    topics:   list[TopicConfig]
    briefing: BriefingConfig  = BriefingConfig()
    output:   OutputConfig    = OutputConfig()


# ── SSE helper ─────────────────────────────────────────────────────────────────

def sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now().isoformat()}


@app.get("/runs")
def list_runs():
    return list(run_history.values())


@app.get("/runs/{run_id}")
def get_run(run_id: str):
    if run_id not in run_history:
        return {"error": "Run not found"}
    return run_history[run_id]


@app.post("/run/stream")
async def run_stream(req: RunRequest):
    run_id = str(uuid.uuid4())[:8]
    q: queue.Queue = queue.Queue()

    # Build config dict from request — same shape as config.yaml
    cfg = {
        "topics":   [t.model_dump() for t in req.topics],
        "briefing": req.briefing.model_dump(),
        "output":   req.output.model_dump(),
    }

    async def event_stream() -> AsyncGenerator[str, None]:
        yield sse_event("run_started", {
            "run_id": run_id,
            "time":   datetime.now().isoformat()
        })

        loop = asyncio.get_event_loop()

        def run_agent_sync():
            try:
                graph       = build_graph_from_config(cfg)
                state       = default_state(cfg, live_queue=q)
                result      = graph.invoke(state)
                q.put(("done", result))
            except Exception as e:
                q.put(("error", str(e)))

        loop.run_in_executor(None, run_agent_sync)

        while True:
            try:
                item = await loop.run_in_executor(
                    None, lambda: q.get(timeout=120)
                )
            except queue.Empty:
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
                    "run_id":   run_id,
                    "topics":   topics,
                    "briefing": result.get("final_briefing", "")
                })
                break

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
        }
    )