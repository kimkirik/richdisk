"""Loopback-only engine and same-origin UI. Run with start.command/start-engine.py."""
from __future__ import annotations

import json
import shutil
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from threading import Event, Lock

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from pipeline import Cancelled, DrumEngine
from private_access import allowed_client, load_private_access

ROOT = Path(__file__).resolve().parent
JOBS_DIR = ROOT / ".jobs"
MAX_BYTES = 220 * 1024 * 1024
TTL = 24 * 3600
PRIVATE_ACCESS = load_private_access(ROOT / ".private-access.json")
ORIGINS = ["http://127.0.0.1:8765", "http://localhost:8765"]
HOSTS = ["127.0.0.1", "localhost", "testserver"]
if PRIVATE_ACCESS.origin:
    ORIGINS.append(PRIVATE_ACCESS.origin)
    HOSTS.append(PRIVATE_ACCESS.hostname)


class UploadLimit:
    """Bound the request before Starlette spools multipart data to disk."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") != "POST":
            return await self.app(scope, receive, send)
        limit = MAX_BYTES + 1024 * 1024
        length = dict(scope.get("headers", [])).get(b"content-length", b"0")
        if length.isdigit() and int(length) > limit:
            return await JSONResponse({"detail": "220MB 이하의 파일을 선택해 주세요."}, status_code=413)(scope, receive, send)
        total = 0

        async def bounded_receive():
            nonlocal total
            message = await receive()
            if message["type"] == "http.request":
                total += len(message.get("body", b""))
                if total > limit:
                    raise HTTPException(413, "220MB 이하의 파일을 선택해 주세요.")
            return message

        await self.app(scope, bounded_receive, send)


app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(UploadLimit)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=HOSTS)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["GET", "POST", "DELETE"],
                   allow_headers=["Content-Type", "X-Drumscore-Client"], expose_headers=["Content-Disposition"])
pool = ThreadPoolExecutor(max_workers=1)
engine = DrumEngine()
lock = Lock()


@dataclass
class Job:
    id: str
    directory: Path
    state: str = "uploading"
    progress: int = 0
    detail: str = "오디오를 준비하고 있어요"
    error: str | None = None
    result: dict | None = None
    created: float = field(default_factory=time.time)
    cancel: Event = field(default_factory=Event)
    title: str = "이전 채보 작업"
    options: dict = field(default_factory=dict)


jobs: dict[str, Job] = {}


def persist_job(job: Job):
    data = {key: getattr(job, key) for key in
            ("id", "state", "progress", "detail", "error", "created", "title", "options")}
    temporary = job.directory / "job.json.tmp"
    temporary.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    temporary.replace(job.directory / "job.json")


def restore_jobs():
    """Recover completed results after a service update; never restart inference."""
    JOBS_DIR.mkdir(exist_ok=True)
    for directory in JOBS_DIR.iterdir():
        identifier = directory.name
        if (identifier in jobs or not directory.is_dir() or len(identifier) != 32 or
                any(c not in "0123456789abcdef" for c in identifier)):
            continue
        try:
            manifest = directory / "job.json"
            result_file = directory / "result.json"
            if not manifest.exists() and not result_file.exists():
                continue
            data = json.loads(manifest.read_text()) if manifest.exists() else {}
            job = Job(identifier, directory, created=data.get("created", directory.stat().st_mtime),
                      title=data.get("title", "이전 채보 작업"), options=data.get("options", {}))
            if result_file.exists():
                job.result = json.loads(result_file.read_text())
                job.state, job.progress, job.detail = "completed", 100, "저장된 채보 결과를 불러왔어요"
            else:
                job.state = data.get("state", "failed")
                job.error = data.get("error")
                if job.state not in ("failed", "cancelled"):
                    job.state = "failed"
                    job.error = "맥의 엔진이 다시 시작되어 분석이 중단됐습니다. 음악을 다시 분석해 주세요."
                job.detail = job.error or "분석을 취소했습니다."
            jobs[identifier] = job
        except (OSError, ValueError, TypeError):
            # One damaged historical result must not break the engine.
            continue


def job_data(job: Job):
    return {"id": job.id, "state": job.state, "progress": job.progress,
            "detail": job.detail, "error": job.error, "result": job.result,
            "title": job.title, "options": job.options, "created": job.created}


@app.middleware("http")
async def local_client_only(request: Request, call_next):
    if not allowed_client(PRIVATE_ACCESS, request.client.host if request.client else "",
                          request.url.hostname, request.headers):
        return JSONResponse({"detail": "본인 Tailscale 계정으로 연결한 기기에서만 사용할 수 있습니다."}, status_code=403)
    origin = request.headers.get("origin")
    if origin and origin not in ORIGINS:
        return JSONResponse({"detail": "이 출처는 허용되지 않습니다."}, status_code=403)
    if request.method in ("POST", "DELETE") and request.headers.get("x-drumscore-client") != "studio-v1":
        return JSONResponse({"detail": "앱에서 분석을 요청해 주세요."}, status_code=403)
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    else:
        response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    # Chromium versions with Private Network Access preflight support.
    if request.headers.get("access-control-request-private-network") == "true" and origin in ORIGINS:
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


def clean_expired():
    JOBS_DIR.mkdir(exist_ok=True)
    for directory in JOBS_DIR.iterdir():
        if not directory.is_dir() or len(directory.name) != 32:
            continue
        if any(c not in "0123456789abcdef" for c in directory.name):
            continue
        job = jobs.get(directory.name)
        if job and job.state in ("uploading", "running", "queued"):
            continue
        if time.time() - directory.stat().st_mtime > TTL:
            shutil.rmtree(directory)
            jobs.pop(directory.name, None)


def find_job(identifier: str) -> Job:
    if identifier not in jobs:
        restore_jobs()
    job = jobs.get(identifier)
    if not job:
        raise HTTPException(404, "분석 결과가 없거나 엔진을 다시 시작했습니다. 다시 분석해 주세요.")
    return job


def execute(job: Job, input_is_drums: bool, sensitivity: int, bpm: float | None):
    def progress(value, detail):
        with lock:
            job.progress, job.detail = value, detail
            persist_job(job)

    try:
        job.state = "running"
        result = engine.run(job.directory / "input.audio", job.directory,
                            input_is_drums=input_is_drums, sensitivity=sensitivity, bpm=bpm,
                            progress=progress, cancel=job.cancel)
        (job.directory / "result.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
        with lock:
            job.result, job.state, job.progress, job.detail = result, "completed", 100, "채보가 완성됐어요"
    except Cancelled:
        job.state, job.detail = "cancelled", "분석을 취소했습니다."
    except Exception as error:
        import traceback
        traceback.print_exc()
        job.state, job.error = "failed", str(error)[:500]
        job.detail = "분석에 실패했습니다."
    finally:
        with lock:
            persist_job(job)
        for filename in ("input.audio", "decoded.wav"):
            (job.directory / filename).unlink(missing_ok=True)
        if job.state in ("failed", "cancelled"):
            for filename in ("drums.wav", "performance.mid", "result.json"):
                (job.directory / filename).unlink(missing_ok=True)


@app.get("/api/health")
def health():
    return {"service": "drum-score-engine", "protocolVersion": 1, "device": engine.device,
            "resumableJobs": True,
            "separation": "htdemucs_ft/drums", "transcription": "ADTOF Frame_RNN",
            "privateUrl": PRIVATE_ACCESS.origin or None,
            "busy": any(j.state in ("running", "queued", "uploading") for j in jobs.values())}


@app.post("/api/jobs", status_code=202)
async def create_job(file: UploadFile = File(...), input_is_drums: bool = Form(False),
                     sensitivity: int = Form(62, ge=35, le=85), bpm: float | None = Form(None, ge=45, le=260),
                     client_id: str | None = Form(None, pattern=r"^[0-9a-f]{32}$"),
                     title: str = Form("음악 파일", max_length=200)):
    with lock:
        restore_jobs()
        clean_expired()
        if client_id and client_id in jobs:
            # An accepted upload with a lost response must be reusable, not
            # submitted to the model a second time. FastAPI closes UploadFile.
            return {"id": client_id}
        if any(j.state in ("uploading", "queued", "running") for j in jobs.values()):
            raise HTTPException(409, "진행 중인 분석이 있습니다. 끝난 뒤 다시 시도해 주세요.")
        identifier = client_id or uuid.uuid4().hex
        directory = JOBS_DIR / identifier
        directory.mkdir()
        job = Job(identifier, directory, detail="오디오를 읽고 있어요", title=title,
                  options={"inputIsDrums": input_is_drums, "sensitivity": sensitivity, "bpm": bpm})
        jobs[identifier] = job
        persist_job(job)
    try:
        total = 0
        with (directory / "input.audio").open("wb") as target:
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_BYTES:
                    raise HTTPException(413, "220MB 이하의 파일을 선택해 주세요.")
                target.write(chunk)
        if not total:
            raise HTTPException(400, "빈 파일은 분석할 수 없습니다.")
    except BaseException:
        job.state = "failed"
        job.error = "음악 업로드가 완료되지 않았습니다. 파일을 다시 선택해 주세요."
        persist_job(job)
        (directory / "input.audio").unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    job.state = "queued"
    persist_job(job)
    pool.submit(execute, job, input_is_drums, sensitivity, bpm)
    return {"id": identifier}


@app.get("/api/jobs/latest")
def latest_job():
    with lock:
        restore_jobs()
        available = [j for j in jobs.values() if j.state in ("uploading", "queued", "running")
                     or time.time() - j.created <= TTL]
        active = [j for j in available if j.state in ("uploading", "queued", "running")]
        job = max(active or available, key=lambda item: item.created, default=None)
        return {"job": job_data(job) if job else None}


@app.get("/api/jobs/{identifier}")
def status(identifier: str):
    job = find_job(identifier)
    with lock:
        return job_data(job)


@app.delete("/api/jobs/{identifier}")
def cancel_job(identifier: str):
    job = find_job(identifier)
    job.cancel.set()
    return {"state": job.state, "detail": "현재 오디오 구간 처리가 끝나면 취소합니다."}


@app.get("/api/jobs/{identifier}/files/{filename}")
def result_file(identifier: str, filename: str):
    job = find_job(identifier)
    if job.state != "completed" or filename not in ("drums.wav", "performance.mid", "result.json"):
        raise HTTPException(404, "완료된 분석 결과가 없습니다.")
    types = {"drums.wav": "audio/wav", "performance.mid": "audio/midi", "result.json": "application/json"}
    return FileResponse(job.directory / filename, media_type=types[filename], filename=filename)


@app.get("/")
def home():
    return FileResponse(ROOT.parent / "index.html")


@app.get("/{filename}")
def asset(filename: str):
    # Never expose the engine directory, weights, uploads, or other richdisk apps.
    if filename not in ("app.js", "pro-client.js", "timing.js", "workspace-store.js", "styles.css"):
        raise HTTPException(404)
    return FileResponse(ROOT.parent / filename)
