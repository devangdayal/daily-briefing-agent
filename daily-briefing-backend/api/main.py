# api/main.py
import asyncio
from http.client import HTTPException
import json
import queue
import uuid
from datetime import datetime
from typing import AsyncGenerator, Optional

from dotenv import load_dotenv
load_dotenv()

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron      import CronTrigger
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
scheduler   = AsyncIOScheduler()
saved_jobs:  dict[str, dict] = {}   # job_id → {config, schedule, job}


# ── Request models ─────────────────────────────────────────────────────────────

class TopicConfig(BaseModel):
    name:        str
    queries:     list[str]
    description: Optional[str] = ""

class BriefingConfig(BaseModel):
    tone:                   str = "professional"
    max_articles_per_topic: int = 5

class OutputConfig(BaseModel):
    save_to_file: bool = True
    file_dir:     str  = "./daily_briefings"
    send_email:   bool = False
    email_to:     str  = ""

class RunRequest(BaseModel):
    topics:   list[TopicConfig]
    briefing: BriefingConfig = BriefingConfig()
    output:   OutputConfig   = OutputConfig()

class ScheduleRequest(BaseModel):
    """
    Cron-based schedule.
    hour + minute = "run at HH:MM every day"
    days_of_week  = "mon,tue,wed,thu,fri" or "*" for every day
    timezone      = IANA timezone string e.g. "Asia/Kolkata"
    """
    topics:       list[TopicConfig]
    briefing:     BriefingConfig = BriefingConfig()
    output:       OutputConfig   = OutputConfig()
    hour:         int    = 7
    minute:       int    = 30
    days_of_week: str    = "mon,tue,wed,thu,fri"
    timezone:     str    = "Asia/Kolkata"
    job_name:     str    = "Daily Briefing"
    
    

def clean_days(cls, v):
     if v is None:
         return None
     v = v.strip()
     return v if v else None
# ── SSE helper ─────────────────────────────────────────────────────────────────

def sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ── Core agent runner — reused by both /run/stream and scheduler ───────────────

def run_agent_sync(cfg: dict, q: queue.Queue):
    """
    Synchronous agent runner.
    Separated from the API so the scheduler can call it directly
    without needing an HTTP request.
    This is the key design — logic lives here, not in the route.
    """
    try:
        graph  = build_graph_from_config(cfg)
        state  = default_state(cfg, live_queue=q)
        result = graph.invoke(state)
        q.put(("done", result))
    except Exception as e:
        q.put(("error", str(e)))


async def run_and_store(cfg: dict, job_name: str = "Scheduled run"):
    """
    Async wrapper used by the scheduler.
    Runs the agent, stores result in run_history, no SSE needed.
    """
    run_id = str(uuid.uuid4())[:8]
    q: queue.Queue = queue.Queue()

    print(f"\n[scheduler] Starting job '{job_name}' — run {run_id}")

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: run_agent_sync(cfg, q))

    while True:
        try:
            item = q.get(timeout=180)
        except queue.Empty:
            print(f"[scheduler] Run {run_id} timed out")
            run_history[run_id] = {
                "run_id":       run_id,
                "job_name":     job_name,
                "date":         datetime.now().strftime("%Y-%m-%d"),
                "status":       "timeout",
                "triggered_by": "scheduler",
                "completed_at": datetime.now().isoformat()
            }
            return

        if item[0] == "done":
            result = item[1]
            topics = [t["name"] for t in result.get("topics", [])]
            run_history[run_id] = {
                "run_id":         run_id,
                "job_name":       job_name,
                "date":           result.get("date", ""),
                "status":         "completed",
                "topics":         topics,
                "final_briefing": result.get("final_briefing", ""),
                "triggered_by":   "scheduler",
                "completed_at":   datetime.now().isoformat()
            }
            print(f"[scheduler] Run {run_id} completed — {len(topics)} topics")
            return

        elif item[0] == "error":
            run_history[run_id] = {
                "run_id":       run_id,
                "job_name":     job_name,
                "date":         datetime.now().strftime("%Y-%m-%d"),
                "status":       "error",
                "error":        item[1],
                "triggered_by": "scheduler",
                "completed_at": datetime.now().isoformat()
            }
            print(f"[scheduler] Run {run_id} error: {item[1]}")
            return

def normalize_cron(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value if value else None

# ── Lifecycle ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    scheduler.start()
    print("[scheduler] APScheduler started")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()
    print("[scheduler] APScheduler stopped")


# ── Routes — health + history ──────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status":     "ok",
        "time":       datetime.now().isoformat(),
        "jobs":       len(saved_jobs),
        "runs":       len(run_history)
    }


@app.get("/runs")
def list_runs():
    return sorted(
        run_history.values(),
        key=lambda r: r.get("completed_at", ""),
        reverse=True
    )


@app.get("/runs/{run_id}")
def get_run(run_id: str):
    if run_id not in run_history:
        return {"error": "Run not found"}
    return run_history[run_id]


# ── Route — manual run with SSE stream ────────────────────────────────────────

@app.post("/run/stream")
async def run_stream(req: RunRequest):
    run_id = str(uuid.uuid4())[:8]
    q: queue.Queue = queue.Queue()

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
        loop.run_in_executor(None, lambda: run_agent_sync(cfg, q))

        while True:
            try:
                item = await loop.run_in_executor(
                    None, lambda: q.get(timeout=180)
                )
            except queue.Empty:
                yield sse_event("run_error", {"message": "Agent timed out"})
                break

            if item[0] == "event":
                _, event_name, data = item
                yield sse_event(event_name, data)

            elif item[0] == "error":
                yield sse_event("run_error", {"message": item[1]})
                break

            elif item[0] == "done":
                result = item[1]
                topics = [t["name"] for t in result.get("topics", [])]

                run_history[run_id] = {
                    "run_id":         run_id,
                    "date":           result.get("date", ""),
                    "status":         "completed",
                    "topics":         topics,
                    "final_briefing": result.get("final_briefing", ""),
                    "events":         result.get("events", []),
                    "triggered_by":   "manual",
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


# ── Routes — job scheduler ─────────────────────────────────────────────────────

@app.post("/jobs")
async def create_job(req: ScheduleRequest):
    """
    Create a new scheduled job.
    APScheduler handles the cron timing — we just define when.

    Why AsyncIOScheduler?
    It runs inside the same event loop as FastAPI.
    No separate thread or process needed.
    """
    job_id = str(uuid.uuid4())[:8]

    cfg = {
        "topics":   [t.model_dump() for t in req.topics],
        "briefing": req.briefing.model_dump(),
        "output":   req.output.model_dump(),
    }

    day_of_week = normalize_cron(req.days_of_week)

        
    try:
        trigger = CronTrigger(
            hour=req.hour,
            minute=req.minute,
            day_of_week=day_of_week,
            timezone=req.timezone
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    job = scheduler.add_job(
        run_and_store,
        trigger=trigger,
        args=[cfg, req.job_name],
        id=job_id,
        name=req.job_name,
        replace_existing=True
    )

    next_run = job.next_run_time.isoformat() if job.next_run_time else None

    saved_jobs[job_id] = {
        "job_id":       job_id,
        "job_name":     req.job_name,
        "schedule":     f"{req.days_of_week} at {req.hour:02d}:{req.minute:02d} {req.timezone}",
        "hour":         req.hour,
        "minute":       req.minute,
        "days_of_week": req.days_of_week,
        "timezone":     req.timezone,
        "next_run":     next_run,
        "active":       True,
        "config":       cfg
    }

    print(f"[scheduler] Job '{req.job_name}' created — next run: {next_run}")

    return {
        "job_id":   job_id,
        "next_run": next_run,
        "message":  f"Job scheduled: {req.job_name}"
    }


@app.get("/jobs")
def list_jobs():
    """List all scheduled jobs with next run time."""
    result = []
    for job_id, saved in saved_jobs.items():
        job = scheduler.get_job(job_id)
        result.append({
            **saved,
            "next_run": job.next_run_time.isoformat() if job and job.next_run_time else None,
            "active":   job is not None
        })
    return result


@app.delete("/jobs/{job_id}")
def delete_job(job_id: str):
    """Remove a scheduled job."""
    if job_id not in saved_jobs:
        return {"error": "Job not found"}
    try:
        scheduler.remove_job(job_id)
    except Exception:
        pass
    del saved_jobs[job_id]
    return {"message": f"Job {job_id} removed"}


@app.post("/jobs/{job_id}/run-now")
async def run_job_now(job_id: str):
    """
    Trigger a scheduled job immediately — useful for testing.
    Runs the same config as the scheduled job, right now.
    """
    if job_id not in saved_jobs:
        return {"error": "Job not found"}
    cfg      = saved_jobs[job_id]["config"]
    job_name = saved_jobs[job_id]["job_name"]
    asyncio.create_task(run_and_store(cfg, job_name + " (manual trigger)"))
    return {"message": f"Job {job_id} triggered immediately"}