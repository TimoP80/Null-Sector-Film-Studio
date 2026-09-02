"""Authenticated Modal LTX HTTP service.

This is intentionally separate from the benchmark and from the Null Sector
server. It exposes a small durable job API and invokes the proven ComfyUI/LTX
worker only after validating the request. Secrets are supplied through Modal
Secret, never source code or request logs.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import subprocess
import threading
import time
import urllib.request
from typing import Any

import modal
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pathlib import Path

SERVICE_SOURCE_REVISION = "diagnostic-current-source-v1"

MAX_BODY_BYTES = 8 * 1024 * 1024
MAX_SOURCE_BYTES = 6 * 1024 * 1024
MAX_FRAMES = 97
MAX_FPS = 60
MAX_DURATION = 10.0
MAX_STEPS = 50
MAX_CFG = 20.0
MAX_QUEUE = 8
MAX_CONCURRENT = 1
DEFAULT_TIMEOUT = 900

import os as _os
app = modal.App(_os.environ.get("MODAL_APP_NAME", "nullsector-ltx-http"))
state_volume = modal.Volume.from_name("nullsector-ltx-service-state", create_if_missing=True)
models_volume = modal.Volume.from_name("nullsector-ltx-service-models", create_if_missing=True)
service_secret = modal.Secret.from_name("nullsector-ltx-http", required_keys=["MODAL_LTX_TOKEN"])

web = FastAPI(title="Null Sector LTX", docs_url=None, redoc_url=None)

@web.get("/diagnostic")
async def diagnostic():
    return {"service": "nullsector-ltx-http", "sourceRevision": SERVICE_SOURCE_REVISION, "status": "ok"}
_lock = threading.Lock()
_active = 0

class JobRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str = Field(pattern="^(t2v|i2v)$")
    prompt: str = Field(min_length=1, max_length=4000)
    negativePrompt: str | None = Field(default=None, max_length=4000)
    sourceImage: str | None = None
    resolution: str = Field(default="864x480", pattern=r"^(480p|720p|864x480|\d{2,4}x\d{2,4})$")
    duration: float = Field(default=1.0, gt=0, le=MAX_DURATION)
    fps: float = Field(default=24.0, gt=0, le=MAX_FPS)
    frames: int = Field(default=25, ge=9, le=MAX_FRAMES)
    steps: int = Field(default=25, ge=1, le=MAX_STEPS)
    cfg: float = Field(default=3.0, gt=0, le=MAX_CFG)
    seed: int | None = Field(default=None, ge=0, le=2**63 - 1)
    outputFormat: str = Field(default="mp4", pattern="^mp4$")

    @model_validator(mode="after")
    def validate_consistency(self) -> "JobRequest":
        if self.type == "i2v":
            if not self.sourceImage:
                raise ValueError("sourceImage is required for i2v")
            if len(self.sourceImage) > MAX_SOURCE_BYTES * 2:
                raise ValueError("sourceImage is too large")
        elif self.sourceImage:
            raise ValueError("sourceImage is only valid for i2v")
        if self.frames > 1 and (self.frames - 1) % 8 != 0:
            raise ValueError("frames must be 8n+1 for LTX")
        return self


def _error(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def _authorize(value: str | None) -> None:
    expected = os.environ.get("MODAL_LTX_TOKEN", "")
    supplied = value[7:] if value and value.startswith("Bearer ") else ""
    if not expected or not supplied or not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Authentication required")


def _state_path(job_id: str) -> Path:
    safe = "".join(c for c in job_id if c.isalnum() or c in "-_")
    if safe != job_id or not safe:
        raise HTTPException(status_code=404, detail="Job not found")
    return Path("/state") / f"{safe}.json"


def _read_state(job_id: str) -> dict[str, Any] | None:
    state_volume.reload()
    path = _state_path(job_id)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def _write_state(state: dict[str, Any]) -> None:
    path = _state_path(state["id"])
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, separators=(",", ":")))
    tmp.replace(path)
    # The ASGI function does not mount the state volume. The GPU worker commits
    # its attached volume after updating state.


def _request_hash(payload: JobRequest) -> str:
    return hashlib.sha256(json.dumps(payload.model_dump(), sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _decode_source(source: str, job_id: str) -> str:
    if not source.startswith("data:image/"):
        raise ValueError("sourceImage must be a data:image/...;base64 URL")
    header, encoded = source.split(",", 1)
    mime = header[5:].split(";", 1)[0].lower()
    if mime not in {"image/png", "image/jpeg", "image/webp"} or ";base64" not in header:
        raise ValueError("sourceImage must be PNG, JPEG, or WebP base64 data")
    try:
        raw = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise ValueError("sourceImage is not valid base64") from exc
    if len(raw) > MAX_SOURCE_BYTES:
        raise ValueError("sourceImage exceeds the size limit")
    if mime == "image/png" and not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("invalid PNG payload")
    if mime == "image/jpeg" and not raw.startswith(b"\xff\xd8\xff"):
        raise ValueError("invalid JPEG payload")
    if mime == "image/webp" and not (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"):
        raise ValueError("invalid WebP payload")
    path = Path("/comfyui/input") / f"{job_id}.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    return path.name


def _ensure_models() -> None:
    from huggingface_hub import hf_hub_download
    import shutil
    files = [
        ("Lightricks/LTX-Video", "ltx-video-2b-v0.9.1.safetensors", Path("/models/checkpoints/ltx-video-2b-v0.9.1.safetensors")),
        ("comfyanonymous/flux_text_encoders", "t5xxl_fp8_e4m3fn.safetensors", Path("/models/text_encoders/t5xxl_fp8_e4m3fn.safetensors")),
    ]
    for repo, name, dest in files:
        if dest.exists() and dest.stat().st_size > 0: continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = hf_hub_download(repo, name, token=os.environ.get("HF_TOKEN") or None, cache_dir=str(dest.parent))
        shutil.copyfile(os.path.realpath(tmp), dest)
    models_volume.commit()


def _validate_mp4(path: Path) -> dict[str, Any]:
    if not path.is_file() or path.stat().st_size <= 0:
        raise RuntimeError("generated MP4 is missing or empty")
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries",
        "format=format_name,duration,size",
        "-show_entries", "stream=codec_name,codec_type,width,height,avg_frame_rate,nb_frames,pix_fmt",
        "-of", "json", str(path),
    ], capture_output=True, text=True, timeout=30, check=False)
    if probe.returncode != 0:
        raise RuntimeError("FFprobe rejected generated MP4")
    result = json.loads(probe.stdout or "{}")
    stream = next((s for s in result.get("streams", []) if s.get("codec_type") == "video"), None)
    if not stream or stream.get("codec_name") != "h264":
        raise RuntimeError("generated result is not an H.264 video")
    decoded = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "null", "-"], timeout=60, check=False)
    if decoded.returncode != 0:
        raise RuntimeError("FFmpeg could not decode generated MP4")
    return {"filename": path.name, "contentType": "video/mp4", "sizeBytes": path.stat().st_size, "probe": result}


worker_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "ca-certificates")
    .pip_install("fastapi", "pydantic", "torch==2.6.0", "torchvision==0.21.0", "torchaudio==2.6.0", "huggingface_hub", "pillow", "comfy-kitchen==0.2.8", extra_index_url="https://download.pytorch.org/whl/cu126")
    .run_commands(f"git clone --depth 1 --branch v0.20.1 https://github.com/comfyanonymous/ComfyUI.git /comfyui", "pip install -r /comfyui/requirements.txt")
    .run_commands("printf 'comfyui:\\n    base_path: /models\\n    checkpoints: checkpoints/\\n    text_encoders: text_encoders/\\n    vae: vae/\\n' > /comfyui/extra_model_paths.yaml")
    .add_local_file("worker.py", "/root/service-worker.py", copy=True)
)


@app.function(
    image=worker_image,
    gpu="L4",
    volumes={"/state": state_volume, "/models": models_volume},
    secrets=[service_secret],
    timeout=DEFAULT_TIMEOUT,
)
def run_job(job_id: str, payload: dict[str, Any]) -> None:
    state = _read_state(job_id)
    if not state or state["status"] == "cancelled":
        return
    now = time.time()
    state.update(status="running", startedAt=now, workerStartedAt=now, workerHeartbeatAt=now)
    _write_state(state)
    print(json.dumps({"event": "worker_started", "jobId": job_id, "modalCallId": state.get("modalCallId"), "elapsedSec": 0}), flush=True)
    try:
        _ensure_models()
        import subprocess
        comfy = subprocess.Popen(["python", "main.py", "--port", "8188", "--listen", "127.0.0.1"], cwd="/comfyui", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            deadline = time.time() + 600
            while time.time() < deadline:
                try:
                    with urllib.request.urlopen("http://127.0.0.1:8188/system_stats", timeout=3): break
                except Exception: time.sleep(2)
            # The worker source is packaged into the GPU image at /root/service-worker.py.
            # Import it only after the GPU container has initialized.
            worker_path = Path("/root/service-worker.py")
            if not worker_path.exists():
                raise RuntimeError("Modal worker.py was not packaged in the GPU image")
            import importlib.util
            worker_spec = importlib.util.spec_from_file_location("nullsector_worker", worker_path)
            if worker_spec is None or worker_spec.loader is None:
                raise RuntimeError("Modal worker module could not be loaded")
            worker_module = importlib.util.module_from_spec(worker_spec)
            worker_spec.loader.exec_module(worker_module)
            result = worker_module.run_ltx_job(payload, job_id)
        finally:
            comfy.terminate()
        state.update(status="completed", completedAt=time.time(), resultPath=result["resultPath"], result=result["result"], promptId=result["promptId"], durationSec=result["durationSec"])
        _write_state(state)
        print(json.dumps({"event": "worker_completed", "jobId": job_id, "modalCallId": state.get("modalCallId"), "elapsedSec": result["durationSec"]}), flush=True)
    except TimeoutError as exc:
        state.update(status="failed", failedAt=time.time(), completedAt=time.time(), error={"code": "TIMEOUT", "message": str(exc)[:500]})
        _write_state(state)
    except Exception as exc:
        state.update(status="failed", failedAt=time.time(), completedAt=time.time(), error={"code": "GENERATION_FAILED", "message": str(exc)[:500]})
        _write_state(state)


@web.middleware("http")
async def request_limits(request: Request, call_next):
    if request.headers.get("content-length") and int(request.headers["content-length"]) > MAX_BODY_BYTES:
        return _error("INVALID_REQUEST", "request body exceeds the size limit", 413)
    return await call_next(request)


@web.post("/v1/jobs")
async def create_job(payload: JobRequest, authorization: str | None = Header(default=None), idempotency_key: str | None = Header(default=None, alias="Idempotency-Key")):
    _authorize(authorization)
    if not idempotency_key or len(idempotency_key) > 200:
        return _error("INVALID_REQUEST", "Idempotency-Key is required", 400)
    request_hash = _request_hash(payload)
    with _lock:
        existing = next((p for p in Path("/state").glob("*.json") if p.is_file() and _read_state(p.stem).get("idempotencyKey") == idempotency_key), None)
        if existing:
            prior = _read_state(existing.stem)
            if prior["requestHash"] != request_hash:
                return _error("IDEMPOTENCY_CONFLICT", "Idempotency-Key was used with a different request", 409)
            return {"id": prior["id"], "providerJobId": prior["id"], "status": prior["status"]}
        jobs = list(Path("/state").glob("*.json"))
        if len(jobs) >= MAX_QUEUE + MAX_CONCURRENT:
            return _error("QUEUE_FULL", "LTX queue is full", 429)
        job_id = f"job_{secrets.token_urlsafe(16)}"
        state = {"id": job_id, "providerJobId": job_id, "idempotencyKey": idempotency_key, "requestHash": request_hash, "request": payload.model_dump(), "status": "queued", "createdAt": time.time()}
        _write_state(state)
    try:
        function_call = run_job.spawn(job_id, payload.model_dump())
        invocation_id = getattr(function_call, "object_id", None)
        if invocation_id:
            state["modalCallId"] = invocation_id
            state["spawnRequestedAt"] = time.time()
            _write_state(state)
    except Exception as exc:
        state.update(status="failed", failedAt=time.time(), completedAt=time.time(), error={"code": "DISPATCH_FAILED", "message": "Modal worker dispatch failed"})
        _write_state(state)
        return _error("DISPATCH_FAILED", "Modal worker dispatch failed", 503)
    return JSONResponse(status_code=202, content={"id": job_id, "providerJobId": job_id, "status": "queued", "modalCallId": state.get("modalCallId")})


@web.post("/v1/jobs/{job_id}/reconcile")
async def reconcile_job(job_id: str, authorization: str | None = Header(default=None)):
    _authorize(authorization)
    state = _read_state(job_id)
    if not state:
        return _error("NOT_FOUND", "job not found", 404)
    call_id = state.get("modalCallId")
    if not call_id:
        state["reconciliation"] = "unknown"
        _write_state(state)
        return {"id": job_id, "status": state["status"], "reconciliation": "unknown", "message": "No Modal invocation identity is recorded"}
    try:
        call = modal.FunctionCall.from_id(call_id)
        state["reconciliation"] = "invocation_found"
        state["reconciledAt"] = time.time()
        _write_state(state)
        return {"id": job_id, "status": state["status"], "reconciliation": "invocation_found", "modalCallId": call_id}
    except Exception:
        state["reconciliation"] = "invocation_unknown"
        state["reconciledAt"] = time.time()
        _write_state(state)
        return {"id": job_id, "status": state["status"], "reconciliation": "invocation_unknown", "message": "Modal invocation could not be observed; no retry was attempted"}


@web.post("/v1/jobs/{job_id}/cancel")
async def cancel_job_post(job_id: str, authorization: str | None = Header(default=None)):
    _authorize(authorization)
    state = _read_state(job_id)
    if not state:
        return _error("NOT_FOUND", "job not found", 404)
    if state["status"] in {"completed", "failed", "cancelled"}:
        return {"id": job_id, "status": state["status"]}
    if state.get("modalCallId"):
        try:
            modal.FunctionCall.from_id(state["modalCallId"]).cancel()
        except Exception:
            pass
    state.update(status="cancelled", cancelledAt=time.time())
    _write_state(state)
    return {"id": job_id, "status": "cancelled"}


@web.get("/v1/jobs/{job_id}")
async def get_job(job_id: str, authorization: str | None = Header(default=None)):
    _authorize(authorization)
    state = _read_state(job_id)
    if not state:
        return _error("NOT_FOUND", "job not found", 404)
    result = {"id": state["id"], "providerJobId": state["providerJobId"], "status": state["status"]}
    if state.get("progress") is not None:
        result["progress"] = state["progress"]
    for field in ("modalCallId", "spawnRequestedAt", "workerStartedAt", "workerHeartbeatAt", "completedAt", "failedAt", "reconciliation"):
        if state.get(field) is not None:
            result[field] = state[field]
    if state["status"] == "completed":
        result["result"] = state["result"]
    if state["status"] == "failed":
        result["error"] = state.get("error", {"code": "GENERATION_FAILED", "message": "Generation failed"})
    return result


@web.delete("/v1/jobs/{job_id}")
async def cancel_job(job_id: str, authorization: str | None = Header(default=None)):
    _authorize(authorization)
    state = _read_state(job_id)
    if not state:
        return _error("NOT_FOUND", "job not found", 404)
    if state["status"] in {"completed", "failed", "cancelled"}:
        return {"id": job_id, "providerJobId": job_id, "status": state["status"]}
    state.update(status="cancelled", cancelledAt=time.time())
    _write_state(state)
    return {"id": job_id, "providerJobId": job_id, "status": "cancelled"}


@web.get("/v1/jobs/{job_id}/result")
async def get_result(job_id: str, authorization: str | None = Header(default=None)):
    _authorize(authorization)
    state = _read_state(job_id)
    if not state:
        return _error("NOT_FOUND", "job not found", 404)
    if state["status"] != "completed" or not state.get("resultPath"):
        return _error("RESULT_NOT_READY", "job has no completed result", 409)
    path = Path(state["resultPath"]).resolve()
    if not path.is_file() or not str(path).startswith("/results/"):
        return _error("OUTPUT_INVALID", "result is unavailable", 410)
    return FileResponse(path, media_type="video/mp4", filename=state["result"]["filename"])


@app.function(image=modal.Image.debian_slim(python_version="3.11").pip_install("fastapi", "pydantic"), secrets=[service_secret], volumes={"/state": state_volume})
@modal.asgi_app()
def api():
    return web
