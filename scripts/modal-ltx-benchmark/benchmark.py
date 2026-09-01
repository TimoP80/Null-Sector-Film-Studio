"""
Modal LTX-Video benchmark harness — isolated evaluation ONLY.

Compares LTX-Video 0.9.1 generation on Modal's GPU cloud against the local
GTX 1070 baseline (which remains untouched). This is a benchmark; nothing here
is wired into the production Null Sector video runtime.

Stack mirrors the verified local environment exactly:
  - ComfyUI v0.20.1 (git tag, same node set the local pipeline uses)
  - ltx-video-2b-v0.9.1.safetensors (checkpoint, bundles VAE)
  - t5xxl_fp8_e4m3fn.safetensors (T5-XXL text encoder)
  - Same workflow graph: CheckpointLoaderSimple -> CLIPLoader(ltxv) ->
    CLIPTextEncode x2 -> LTXVConditioning -> EmptyLTXVLatentVideo ->
    KSamplerSelect -> LTXVScheduler -> SamplerCustom -> VAEDecode ->
    CreateVideo -> SaveVideo (mp4/h264)

Cost guard: this script only runs the L4 GPU (or T4 with explicit --gpu).
The run() entrypoint reports an estimate before launching and refuses to
launch when the remaining budget would be exceeded.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

import modal

# ---------------------------------------------------------------------------
# Hard budget guard
# ---------------------------------------------------------------------------
BENCHMARK_BUDGET_USD = 10.0
PREFERRED_BUDGET_USD = 5.0
GPU_HOURLY_USD = {  # Modal on-demand pricing (modal.com/pricing, verified 2026-09)
    "T4": 0.59,
    "L4": 0.80,
    "A10": 1.10,
}
ESTIMATED_RUN_HOURS = 0.45  # conservative: model download+load+inference+encode on L4

# repo-id -> (path-in-repo, destination-under-/models)
MODEL_FILES = {
    "Lightricks/LTX-Video": [("ltx-video-2b-v0.9.1.safetensors", "checkpoints/ltx-video-2b-v0.9.1.safetensors")],
    "comfyanonymous/flux_text_encoders": [("t5xxl_fp8_e4m3fn.safetensors", "text_encoders/t5xxl_fp8_e4m3fn.safetensors")],
}

COMFYUI_TAG = "v0.20.1"
COMFYUI_REPO = "https://github.com/comfyanonymous/ComfyUI.git"

BENCHMARK_PROMPT = (
    "A lone futuristic vehicle driving slowly through a ruined post-apocalyptic "
    "city at dawn, cinematic composition, realistic lighting, subtle atmospheric "
    "dust, steady camera movement."
)

app = modal.App("nullsector-ltx-benchmark")
models_volume = modal.Volume.from_name("ltx-benchmark-models", create_if_missing=True)
output_volume = modal.Volume.from_name("ltx-benchmark-outputs", create_if_missing=True)
hf_secret = modal.Secret.from_name("huggingface-token", required_keys=[])

# The GPU is fixed at decoration time by Modal. L4 ($0.80/hr, 24 GB VRAM) is the
# default benchmark GPU; to use T4/A10 instead, edit BENCH_GPU here.
BENCH_GPU = os.environ.get("MODAL_BENCH_GPU", "L4")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .run_commands(
        "apt-get update && apt-get install -y --no-install-recommends git ffmpeg libgl1 libglib2.0-0 ca-certificates && rm -rf /var/lib/apt/lists/*"
    )
    .pip_install("torch==2.6.0", "torchvision==0.21.0", "torchaudio==2.6.0",
                 extra_index_url="https://download.pytorch.org/whl/cu126",
                 force_build=True)
    .pip_install("huggingface_hub", "requests", "pillow")
    .run_commands(
        f"git clone --depth 1 --branch {COMFYUI_TAG} {COMFYUI_REPO} /comfyui",
        "pip install -r /comfyui/requirements.txt comfy-kitchen==0.2.8",
    )
    # extra_model_paths so ComfyUI reads models from the mounted volume.
    .run_commands(
        # /models and /outputs are provided by the mounted Volumes — do NOT mkdir
        # them in the image; Modal refuses to mount a Volume over a non-empty path.
        "mkdir -p /comfyui/output",
        'printf "comfyui:\\n    base_path: /models\\n    checkpoints: checkpoints/\\n    text_encoders: text_encoders/\\n    diffusion_models: diffusion_models/\\n    vae: vae/\\n" > /comfyui/extra_model_paths.yaml',
    )
)


def _make_source_image(width: int, height: int) -> str:
    """Create a deterministic synthetic test image for image-to-video (no
    personal, photographic, or copyrighted content). Returns the filename as
    ComfyUI's LoadImage expects it (relative to the input dir)."""
    import random
    from PIL import Image, ImageDraw
    rng = random.Random(7)
    img = Image.new("RGB", (width, height), (10, 8, 16))
    d = ImageDraw.Draw(img)
    # abstract gradient-like bands + geometric shapes
    for y in range(height):
        t = y / height
        d.line([(0, y), (width, y)], fill=(int(12 + 40 * t), int(10 + 12 * t), int(22 + 60 * t)))
    d.ellipse([width * 0.62, height * 0.12, width * 0.78, height * 0.3], fill=(210, 96, 40))
    for _ in range(90):
        x = rng.randint(0, width - 1)
        y = rng.randint(0, height - 1)
        r = rng.randint(1, 5)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(28, 30, 48))
    d.rectangle([0, int(height * 0.72), width, height], fill=(16, 14, 22))
    path = Path("/comfyui/input/bench_source.png")
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return path.name


def _build_workflow(mode: str, resolution: tuple[int, int], num_frames: int,
                    fps: float, steps: int, seed: int, source_image: str | None) -> dict:
    """Build the same LTX workflow graph the Null Sector local pipeline uses.

    Text-to-video:  CheckpointLoaderSimple -> CLIPLoader(ltxv) -> CLIPTextEncode
      x2 -> LTXVConditioning -> EmptyLTXVLatentVideo -> KSamplerSelect ->
      LTXVScheduler -> SamplerCustom -> VAEDecode -> CreateVideo -> SaveVideo
    Image-to-video: same, except LTXVImgToVideo (fed by LoadImage) replaces
      EmptyLTXVLatentVideo and is the conditioning+latent source (mirrors
      server.ts buildLocalVideoWorkflow isImageToVideo branch exactly)."""
    width, height = resolution
    length = num_frames
    workflow = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "ltx-video-2b-v0.9.1.safetensors"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "t5xxl_fp8_e4m3fn.safetensors", "type": "ltxv", "device": "default"}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": BENCHMARK_PROMPT, "clip": ["2", 0]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": "low quality, worst quality, deformed, distorted, motion smear, motion artifacts, fused fingers, bad anatomy, ugly", "clip": ["2", 0]}},
        "5": {"class_type": "LTXVConditioning", "inputs": {"positive": ["3", 0], "negative": ["4", 0], "frame_rate": fps}},
    }
    is_i2v = mode == "i2v" and source_image is not None
    if is_i2v:
        workflow["7"] = {"class_type": "LoadImage", "inputs": {"image": source_image}}
        workflow["6"] = {"class_type": "LTXVImgToVideo", "inputs": {
            "positive": ["5", 0], "negative": ["5", 1], "vae": ["1", 2],
            "image": ["7", 0], "width": width, "height": height,
            "length": length, "batch_size": 1, "strength": 0.85}}
    else:
        workflow["6"] = {"class_type": "EmptyLTXVLatentVideo", "inputs": {
            "width": width, "height": height, "length": length, "batch_size": 1}}
    positive = ["6", 0] if is_i2v else ["5", 0]
    negative = ["6", 1] if is_i2v else ["5", 1]
    latent = ["6", 2] if is_i2v else ["6", 0]
    workflow["8"] = {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}}
    workflow["9"] = {"class_type": "LTXVScheduler", "inputs": {"steps": steps, "max_shift": 2.05, "base_shift": 0.95, "stretch": True, "terminal": 0.1, "latent": latent}}
    workflow["10"] = {"class_type": "SamplerCustom", "inputs": {"add_noise": True, "noise_seed": seed, "cfg": 3.0, "model": ["1", 0], "positive": positive, "negative": negative, "sampler": ["8", 0], "sigmas": ["9", 0], "latent_image": latent}}
    workflow["11"] = {"class_type": "VAEDecode", "inputs": {"samples": ["10", 0], "vae": ["1", 2]}}
    workflow["13"] = {"class_type": "CreateVideo", "inputs": {"images": ["11", 0], "fps": fps}}
    workflow["12"] = {"class_type": "SaveVideo", "inputs": {"video": ["13", 0], "filename_prefix": f"nullsector_ltx_{mode}", "format": "mp4", "codec": "h264"}}
    return workflow


def _ensure_models() -> None:
    """Download the required model files into the mounted volume (once)."""
    import shutil
    from huggingface_hub import hf_hub_download
    for repo_id, files in MODEL_FILES.items():
        for path_in_repo, rel_dest in files:
            dest = Path("/models") / rel_dest
            # A previous partial attempt may have left a dangling symlink.
            if dest.is_symlink() or (dest.exists() and dest.stat().st_size <= 0):
                dest.unlink(missing_ok=True)
            if dest.exists() and dest.stat().st_size > 0:
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            print(f"[benchmark] downloading {repo_id}/{path_in_repo} ...")
            token = os.environ.get("HF_TOKEN")
            tmp = hf_hub_download(
                repo_id, path_in_repo,
                token=token or None,
                cache_dir=dest.parent,
            )
            # hf_hub_download returns a blob symlink; Modal volumes do not carry
            # symlinks, so materialize a real file (copyfile follows the link).
            if os.path.islink(tmp):
                shutil.copyfile(os.path.realpath(tmp), dest)
                os.unlink(tmp)
            else:
                Path(tmp).rename(dest)
    models_volume.commit()


@app.function(
    image=image,
    volumes={"/models": models_volume, "/outputs": output_volume},
    secrets=[hf_secret],
    gpu=BENCH_GPU,
    timeout=1800,
)
def prepare_and_generate(mode: str = "t2v", resolution: tuple[int, int] = (864, 480),
                         num_frames: int = 25, fps: float = 24.0, steps: int = 25, seed: int = 42,
                         force_download: bool = False) -> dict:
    """Ensure models exist on the volume, start ComfyUI headless, run the
    same LTX workflow the Null Sector local pipeline uses, and save the MP4."""
    started_total = time.time()
    stage_times: dict[str, float] = {}
    vram_info: dict = {}

    # ---- model download (first invocation only) ---------------------------
    t0 = time.time()
    if force_download:
        for repo_id, files in MODEL_FILES.items():
            for path_in_repo, rel_dest in files:
                (Path("/models") / rel_dest).unlink(missing_ok=True)
    _ensure_models()
    stage_times["model_download"] = time.time() - t0

    # ---- start ComfyUI headless -------------------------------------------
    t0 = time.time()
    import subprocess
    env = dict(os.environ)
    env["PYTHONUNBUFFERED"] = "1"
    log_file = open("/tmp/comfyui.log", "w")
    proc = subprocess.Popen(
        [sys.executable, "main.py", "--port", "8188", "--listen", "127.0.0.1"],
        cwd="/comfyui", env=env,
        stdout=log_file, stderr=subprocess.STDOUT,
    )
    ready = False
    base = "http://127.0.0.1:8188"
    deadline = time.time() + 600
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{base}/system_stats", timeout=3) as r:
                if r.status == 200:
                    ready = True
                    break
        except Exception:
            pass
        time.sleep(2)
    if not ready:
        proc.terminate()
        raise RuntimeError("ComfyUI did not become ready in 600s")
    stage_times["comfyui_start"] = time.time() - t0

    with urllib.request.urlopen(f"{base}/system_stats", timeout=10) as r:
        stats = json.loads(r.read())
    for dev in stats.get("devices", []):
        if dev.get("type") == "cuda":
            vram_info = {"name": dev.get("name"), "vram_total": dev.get("vram_total"), "vram_free": dev.get("vram_free")}
    import torch
    vram_info["torch"] = torch.__version__
    vram_info["cuda_available"] = bool(torch.cuda.is_available())
    vram_info["device_name"] = torch.cuda.get_device_name(0) if torch.cuda.is_available() else None

    # ---- build the same workflow the local pipeline uses ------------------
    source_image = None
    if mode == "i2v":
        source_image = _make_source_image(*resolution)
    workflow = _build_workflow(mode, resolution, num_frames, fps, steps, seed, source_image)

    # ---- submit + poll ----------------------------------------------------
    t0 = time.time()
    body = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(f"{base}/prompt", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        res = json.loads(r.read())
    prompt_id = res.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"ComfyUI returned no prompt_id: {res}")
    stage_times["submit"] = time.time() - t0

    inference_done = False
    deadline = time.time() + 3600
    while time.time() < deadline and not inference_done:
        time.sleep(5)
        try:
            with urllib.request.urlopen(f"{base}/history/{prompt_id}", timeout=10) as r:
                hist = json.loads(r.read())
        except Exception:
            continue
        entry = hist.get(prompt_id, {})
        status = entry.get("status", {})
        if status.get("status_str") == "error":
            msgs = status.get("messages", [])
            err_detail = None
            for kind, payload in (msgs if isinstance(msgs, list) else []):
                if kind == "execution_error" and isinstance(payload, dict):
                    err_detail = payload.get("exception_message") or payload.get("exception_type")
                    break
            tail = open("/tmp/comfyui.log").read()[-4000:]
            raise RuntimeError(f"ComfyUI execution error: {err_detail} | stderr-tail: {tail}")
        if status.get("completed") is True:
            inference_done = True
    if not inference_done:
        raise RuntimeError("Timed out waiting for ComfyUI prompt")
    stage_times["inference"] = time.time() - t0

    with urllib.request.urlopen(f"{base}/history/{prompt_id}", timeout=10) as r:
        hist = json.loads(r.read())
    files = []
    for node_out in hist[prompt_id].get("outputs", {}).values():
        for key in ("videos", "gifs", "images"):
            files.extend(item.get("filename") for item in node_out.get(key, []) or [])
    if not files:
        raise RuntimeError("ComfyUI completed without output file")

    # ---- copy output to volume + return metrics ---------------------------
    t0 = time.time()
    out_name = sorted(files)[0]
    out_src = Path("/comfyui/output") / out_name
    out_dest = Path("/outputs") / out_name
    out_dest.write_bytes(out_src.read_bytes())
    output_volume.commit()
    stage_times["persist"] = time.time() - t0
    stage_times["total"] = time.time() - started_total

    proc.terminate()

    return {
        "status": "ok",
        "gpu": BENCH_GPU,
        "vram": vram_info,
        "output_file": out_name,
        "output_size": out_dest.stat().st_size,
        "resolution": list(resolution),
        "frames": num_frames,
        "fps": fps,
        "steps": steps,
        "seed": seed,
        "prompt_id": prompt_id,
        "stage_times_sec": stage_times,
    }


@app.local_entrypoint()
def run(mode: str = "t2v", force_download: bool = False, budget: float = BENCHMARK_BUDGET_USD):
    """Run the benchmark once on the decorator-configured GPU (default L4)."""
    if BENCH_GPU not in GPU_HOURLY_USD:
        print(f"Refusing: unknown GPU '{BENCH_GPU}' (MODAL_BENCH_GPU). Allowed: {list(GPU_HOURLY_USD)}")
        sys.exit(1)
    hourly = GPU_HOURLY_USD[BENCH_GPU]
    estimate = hourly * ESTIMATED_RUN_HOURS
    print("=" * 68)
    print("[cost guard] GPU:", BENCH_GPU, f"| ${hourly:.2f}/hr")
    print(f"[cost guard] estimated runtime (conservative): {ESTIMATED_RUN_HOURS*60:.0f} min -> est. ${estimate:.2f}")
    print(f"[cost guard] benchmark budget: ${budget:.2f} | preferred < ${PREFERRED_BUDGET_USD:.2f}")
    if estimate > budget:
        print(f"[cost guard] ABORT: estimated ${estimate:.2f} exceeds budget ${budget:.2f}")
        sys.exit(2)
    print("=" * 68)

    result = prepare_and_generate.remote(mode=mode, force_download=force_download)
    print(json.dumps(result, indent=2))
    estimate_actual = hourly * result["stage_times_sec"]["total"] / 3600
    print(f"[cost] actual GPU wall time {result['stage_times_sec']['total']:.1f}s -> est. ${estimate_actual:.3f}")