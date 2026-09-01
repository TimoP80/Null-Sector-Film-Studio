"""Reusable LTX worker for the authenticated Modal service.

The workflow mirrors the verified benchmark: ComfyUI v0.20.1, LTX v0.9.1,
T5-XXL FP8, native CreateVideo -> SaveVideo, and H.264 MP4 validation.
"""
from __future__ import annotations

import base64
import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path
from typing import Any

COMFYUI_TAG = "v0.20.1"
CHECKPOINT = "ltx-video-2b-v0.9.1.safetensors"
TEXT_ENCODER = "t5xxl_fp8_e4m3fn.safetensors"
NEGATIVE = "low quality, worst quality, deformed, distorted, motion smear, motion artifacts, fused fingers, bad anatomy, ugly"


def _parse_resolution(value: str) -> tuple[int, int]:
    if value == "480p": return 864, 480
    if value == "720p": return 1280, 720
    width, height = (int(part) for part in value.split("x", 1))
    return width, height


def build_workflow(request: dict[str, Any], source_filename: str | None = None) -> dict[str, Any]:
    width, height = _parse_resolution(request["resolution"])
    frames = int(request["frames"])
    fps = float(request["fps"])
    steps = int(request["steps"])
    cfg = float(request["cfg"])
    seed = int(request.get("seed") if request.get("seed") is not None else 42)
    workflow: dict[str, Any] = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": TEXT_ENCODER, "type": "ltxv", "device": "default"}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": request["prompt"], "clip": ["2", 0]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": request.get("negativePrompt") or NEGATIVE, "clip": ["2", 0]}},
        "5": {"class_type": "LTXVConditioning", "inputs": {"positive": ["3", 0], "negative": ["4", 0], "frame_rate": fps}},
    }
    if request["type"] == "i2v":
        workflow["7"] = {"class_type": "LoadImage", "inputs": {"image": source_filename}}
        workflow["6"] = {"class_type": "LTXVImgToVideo", "inputs": {
            "positive": ["5", 0], "negative": ["5", 1], "vae": ["1", 2], "image": ["7", 0],
            "width": width, "height": height, "length": frames, "batch_size": 1, "strength": 0.85,
        }}
        positive, negative, latent = ["6", 0], ["6", 1], ["6", 2]
    else:
        workflow["6"] = {"class_type": "EmptyLTXVLatentVideo", "inputs": {"width": width, "height": height, "length": frames, "batch_size": 1}}
        positive, negative, latent = ["5", 0], ["5", 1], ["6", 0]
    workflow["8"] = {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}}
    workflow["9"] = {"class_type": "LTXVScheduler", "inputs": {"steps": steps, "max_shift": 2.05, "base_shift": 0.95, "stretch": True, "terminal": 0.1, "latent": latent}}
    workflow["10"] = {"class_type": "SamplerCustom", "inputs": {
        "add_noise": True, "noise_seed": seed, "cfg": cfg, "model": ["1", 0],
        "positive": positive, "negative": negative, "sampler": ["8", 0], "sigmas": ["9", 0], "latent_image": latent,
    }}
    workflow["11"] = {"class_type": "VAEDecode", "inputs": {"samples": ["10", 0], "vae": ["1", 2]}}
    workflow["13"] = {"class_type": "CreateVideo", "inputs": {"images": ["11", 0], "fps": fps}}
    workflow["12"] = {"class_type": "SaveVideo", "inputs": {"video": ["13", 0], "filename_prefix": "nullsector_service", "format": "mp4", "codec": "h264"}}
    return workflow


def _decode_data_image(source: str, job_id: str) -> str:
    if not source.startswith("data:image/") or "," not in source:
        raise ValueError("sourceImage must be a data image URL")
    header, encoded = source.split(",", 1)
    mime = header[5:].split(";", 1)[0].lower()
    raw = base64.b64decode(encoded, validate=True)
    path = Path("/comfyui/input") / f"{job_id}.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    if mime == "image/png" and not raw.startswith(b"\x89PNG\r\n\x1a\n"): raise ValueError("invalid PNG")
    if mime == "image/jpeg" and not raw.startswith(b"\xff\xd8\xff"): raise ValueError("invalid JPEG")
    if mime == "image/webp" and not (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"): raise ValueError("invalid WebP")
    path.write_bytes(raw)
    return path.name


def validate_mp4(path: Path) -> dict[str, Any]:
    if not path.is_file() or path.stat().st_size <= 0: raise RuntimeError("output is missing or empty")
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=format_name,duration,size", "-show_entries", "stream=codec_type,codec_name,width,height,avg_frame_rate,nb_frames,pix_fmt", "-of", "json", str(path)], capture_output=True, text=True, timeout=30, check=False)
    if probe.returncode != 0: raise RuntimeError("FFprobe rejected MP4")
    parsed = json.loads(probe.stdout or "{}")
    stream = next((s for s in parsed.get("streams", []) if s.get("codec_type") == "video"), None)
    if not stream or stream.get("codec_name") != "h264": raise RuntimeError("result is not H.264 video")
    if int(stream.get("width", 0)) <= 0 or int(stream.get("height", 0)) <= 0: raise RuntimeError("invalid dimensions")
    if subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "null", "-"], timeout=60, check=False).returncode != 0: raise RuntimeError("FFmpeg decode failed")
    return {"filename": path.name, "contentType": "video/mp4", "sizeBytes": path.stat().st_size, "probe": parsed}


def run_ltx_job(request: dict[str, Any], job_id: str, comfyui: str = "http://127.0.0.1:8188") -> dict[str, Any]:
    """Run one validated request against a local ComfyUI process in the Modal worker."""
    started = time.time()
    source_filename = _decode_data_image(request["sourceImage"], job_id) if request["type"] == "i2v" else None
    workflow = build_workflow(request, source_filename)
    body = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(f"{comfyui}/prompt", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as response:
        submission = json.loads(response.read())
    prompt_id = submission.get("prompt_id")
    if not prompt_id: raise RuntimeError("ComfyUI returned no prompt_id")
    deadline = time.time() + int(os.environ.get("MODAL_LTX_TIMEOUT_SEC", "900"))
    output_files: list[dict[str, Any]] = []
    while time.time() < deadline:
        time.sleep(2)
        with urllib.request.urlopen(f"{comfyui}/history/{prompt_id}", timeout=20) as response:
            history = json.loads(response.read())
        entry = history.get(prompt_id, {})
        status = entry.get("status", {})
        if status.get("status_str") == "error":
            raise RuntimeError("ComfyUI execution failed")
        if status.get("completed") is True:
            for output in entry.get("outputs", {}).values():
                output_files.extend(output.get("videos", []) or [])
            break
    if not output_files: raise TimeoutError(f"ComfyUI job {prompt_id} timed out or returned no MP4")
    source = Path("/comfyui/output") / output_files[0]["filename"]
    result_dir = Path("/results") / job_id
    result_dir.mkdir(parents=True, exist_ok=True)
    destination = result_dir / "result.mp4"
    destination.write_bytes(source.read_bytes())
    metadata = validate_mp4(destination)
    if source_filename:
        try: (Path("/comfyui/input") / source_filename).unlink()
        except FileNotFoundError: pass
    return {"resultPath": str(destination), "result": metadata, "promptId": prompt_id, "durationSec": time.time() - started}
