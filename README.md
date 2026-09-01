<img width="2752" height="1536" alt="Logo_for_Null_Sector_Film_202608201144" src="https://github.com/user-attachments/assets/a2ac68df-3581-477e-979a-9df6b8cccfa9" />

# AI Filmmaking Production Studio

A browser-based production workspace for planning, generating, reviewing, and assembling AI-assisted films. The studio keeps screenplay, scene, character, location, shot, dialogue, audio, continuity, generation, and validation data in one structured film project.

The repository is the **Null Sector Film Studio** application.

## What it includes

- Screenplay workspace with structured scene, character, location, and dialogue breakdowns
- Character and location departments with reference assets and lock state
- Scene breakdown and cinematic shot-list generation
- Shot Designer with camera, lens, lighting, subject, style, and prompt controls
- Storyboard and image-generation workflows with fallback rendering paths
- Visual take review with selection, rejection, approval, and master-take state
- Dialogue, TTS, music, SFX, and ambience workflows
- Continuity auditing and production validation
- Shot List / Production Matrix with readiness states and detailed checks
- Deterministic scene recommendations with direct filtered Shot List navigation
- Read-only AI Production Supervisor with film-level production health metrics
- Timeline assembly, AI editing assistance, export, settings, and Zero-Budget Mode

## Quick start

### Requirements

- Node.js 18 or newer
- npm
- A Gemini API key for provider-backed AI features (optional for local and fallback workflows)

### Install

```bash
npm install
```

Copy the environment template if you want to configure the server locally:

```bash
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env` to enable Gemini-backed screenplay analysis, prompt generation, image editing, music, TTS, continuity audit, live voice, and assistant features. The application also exposes provider availability through `/api/providers/status`.

### Run in development

```bash
npm run dev
```

The development server runs on port `3000` by default.

### Build and run production output

```bash
npm run build
npm start
```

### Run as a standalone Electron application

The Electron shell starts the same bundled Express/WebSocket server used by the production web build, then loads it in a secured desktop window. This preserves the existing API routes, Live Voice WebSocket, provider integrations, and Zero-Budget behavior without introducing a second application runtime.

For local desktop development:

```bash
npm run electron:dev
```

Create a Windows installer:

```bash
npm run electron:build
```

The installer is written to `release/`. Do not package `.env` files or API keys. Configure `GEMINI_API_KEY` in the environment of the installed application only when provider-backed generation is required; screenplay, planning, review, readiness, and manual-asset workflows remain available without it.

## Modal LTX accelerator (explicit opt-in)

The isolated Modal benchmark in `scripts/modal-ltx-benchmark/` verified LTX v0.9.1 on an L4 GPU, but it is not itself a production HTTP service. Modal production use requires a separately deployed, authenticated adapter that accepts the existing application request shape and returns a durable or retrievable MP4 job result. Never place Modal credentials in source, `.env` files committed to Git, frontend code, or logs.

The provider is registered for discovery but remains unavailable until a real endpoint is configured. Local ComfyUI remains the default and is not replaced:

```bash
# Only after deploying and securing a compatible Modal HTTP adapter
MODAL_LTX_ENABLED=true
MODAL_LTX_ENDPOINT=https://your-authenticated-modal-adapter.example
MODAL_LTX_TIMEOUT_SEC=900
MODAL_LTX_MAX_COST_USD=1
VIDEO_PROVIDER=auto       # local | modal | auto
```

`local` always selects ComfyUI. `modal` must fail rather than consume local GPU time when Modal is unavailable. `auto` may fall back to local only for retryable infrastructure failures; invalid requests and ambiguous completed-but-unacknowledged remote jobs must not trigger a second paid generation.

## Local video generation (Zero-Budget)

Local video generation runs entirely on your GPU without cloud API billing. It uses [ComfyUI](https://github.com/comfyanonymous/ComfyUI) as the inference backend and [LTX-Video](https://github.com/Lightricks/LTX-Video) as the default model.

### Requirements

- ComfyUI installed and running
- LTX-Video model checkpoints downloaded to ComfyUI (`ltx-video-2b-v0.9.1.safetensors`, `t5xxl_fp16.safetensors`)
- NVIDIA GPU with sufficient VRAM (8 GB+ recommended)
- Python 3.10+ with CUDA toolkit

### Configuration

Set these environment variables or add them to `.env`:

```bash
LOCAL_VIDEO_ENABLED=true
LOCAL_VIDEO_URL=http://127.0.0.1:8188
LOCAL_VIDEO_MODEL=ltx-video
```

Optional:

```bash
LOCAL_VIDEO_TIMEOUT_SEC=1500  # raise for slow GPUs: LTX image-to-video on 8 GB VRAM can take 10-20+ min
LOCAL_VIDEO_POLL_INTERVAL_SEC=2
# webp | mp4 | auto — mp4 uses native CreateVideo→SaveVideo (ComfyUI 0.20.x) or VideoHelperSuite (VHS_VideoCombine)
LOCAL_VIDEO_OUTPUT_FORMAT=auto
```

### Output format, resolution & aspect ratio

- **Output format** is detected from the backend: MP4 is offered when either the native ComfyUI 0.20.x `CreateVideo`→`SaveVideo` nodes (H.264 via PyAV) or the `VHS_VideoCombine` node (VideoHelperSuite) is installed; otherwise the app produces animated WEBP and reports that clearly. MP4 is never claimed when WEBP was generated.
- **Resolution** is mapped from the project resolution to `480p` / `720p` / `1080p`. `4K`/`8K` project resolutions are rejected with `INVALID_REQUEST` rather than silently downgraded.
- **Aspect ratio** supports `16:9`, `16:10`, `4:3`, `3:4`, `1:1`, `9:16`, `21:9`, `2.39:1`, and `1.85:1`. Dimensions are normalized to multiples of 32 (LTX-Video latent alignment).
- **GPU/VRAM** is reported from `/system_stats`; VRAM below 8 GB is flagged as potentially insufficient.

### Start the backend

```bash
# From your ComfyUI directory
python main.py --listen 127.0.0.1 --port 8188
```

### How it works

1. Null Sector detects the ComfyUI backend via `/system_stats` and reports the detected GPU/VRAM/CUDA.
2. Available `UNETLoader` checkpoints are queried via `/object_info/UNETLoader` so a missing LTX-Video model is reported as `MODEL_UNAVAILABLE` instead of being assumed to exist.
3. Required workflow nodes are verified via `/object_info` before submitting, and output capabilities (WEBP/MP4) are derived from the installed nodes.
4. A LTX-Video text-to-video workflow is built from the cinematic prompt using the mapped resolution and aspect ratio.
5. The workflow is submitted to ComfyUI and polled until the output file exists.
6. The completed file is validated, copied into the durable asset directory, and served from `/api/assets/videos/...`, then attached to the shot as a `ShotTake`.
7. `shotReadiness.ts` recognizes local video takes identically to Veo takes.

### Limitations

- Local generation is asynchronous and can take several minutes depending on GPU.
- Keyframe (image-to-video) support requires the `LTXVImgToVideo` node and corresponding model; a keyframe that cannot be uploaded fails the job rather than being silently dropped.
- The default workflow saves animated WEBP (ComfyUI core). MP4 output uses the native ComfyUI 0.20.x `CreateVideo`→`SaveVideo` nodes (H.264), or falls back to VideoHelperSuite (`VHS_VideoCombine`) on older backends.
- The default workflow is minimal; replace it with a custom ComfyUI workflow for higher quality.
- Generated files are copied into the local asset directory so they survive backend output-folder cleanup.

## Local image generation (Zero-Budget)

Local image generation runs entirely on your GPU without cloud API billing. It uses [ComfyUI](https://github.com/comfyanonymous/ComfyUI) as the inference backend and the installed SD 1.5 / SDXL / Flux checkpoint (verified against the backend, never assumed).

### Requirements

- ComfyUI installed and running (same instance as video, or separate)
- An **image checkpoint** in ComfyUI's `models/checkpoints` (see model recommendation below)
- NVIDIA GPU with CUDA (verified via `/system_stats`; ComfyUI handles offloading)

### Recommended model for a GTX 1070 (8 GB VRAM)

Flux (≈12 GB, 1 MP native) is **not** practical on 8 GB VRAM. The realistic choice for reliable generation is an **SD 1.5 family checkpoint (~2 GB)**:

- `DreamShaper 8` (`dreamshaper_8.safetensors`, ~2 GB) — strong cinematic/concept results
- `v1-5-pruned-emaonly.safetensors` (~2 GB) — canonical vanilla SD 1.5

SDXL base (~6.9 GB) is marginal on 8 GB and should be used with ComfyUI CPU offloading and 768–1024 px only. Install the file into ComfyUI's `models/checkpoints`, then either set `LOCAL_IMAGE_MODEL` to the exact filename or leave it as `auto` (picks the first installed image checkpoint). Video checkpoints (LTX/Wan) are never used for image generation.

### Configuration

```bash
LOCAL_IMAGE_ENABLED=true
LOCAL_IMAGE_URL=http://127.0.0.1:8188
LOCAL_IMAGE_MODEL=auto
```

Optional:

```bash
LOCAL_IMAGE_TIMEOUT_SEC=300
LOCAL_IMAGE_POLL_INTERVAL_SEC=1
```

### How it works

1. Null Sector detects the ComfyUI backend via `/system_stats` (shared with local video) and reports GPU, VRAM, and system RAM.
2. Installed checkpoints are queried via `/object_info/CheckpointLoaderSimple`; a missing/mismatched image checkpoint is reported as `MODEL_UNAVAILABLE` with the available list — generation never starts without a verified model.
3. Required nodes (`CheckpointLoaderSimple`, `CLIPTextEncode`, `EmptyLatentImage`, `KSampler`, `VAEDecode`, `SaveImage`) are verified against `/object_info` before submission; image-to-image additionally requires `LoadImage`/`ImageScale`/`VAEEncode`.
4. A text-to-image (or image-to-image with reference + denoise) workflow is built with the requested prompt, negative prompt, steps, CFG, sampler, scheduler, seed, and batch size.
5. The workflow is submitted to ComfyUI and polled until every output file exists.
6. Each output file is validated — non-empty, valid `image/*` content type, and a real PNG/JPEG/WebP/GIF signature — then copied into the durable asset directory and served from `/api/assets/images/...`.
7. A successful take is attached to the shot as a `ShotTake` (`approved: false`, `isMaster: false`); Visual Take Review remains the authority for approval.
8. `shotReadiness.ts` recognizes local image takes identically to Gemini takes.

### Resolution safety

Requested resolutions are honored exactly — never silently resized. Presets: `512x512`, `640x640`, `768x768`, `1024x1024`, `16:9`, `4:3`, `3:2`, `9:16`, `2:3`, `1:1`, or explicit `WxH` up to `1024x1024`. Anything larger (e.g. the legacy 2K/4K sizes) is rejected with `INVALID_REQUEST`. On GPUs with < 12 GB VRAM, requests above 768×768 return a `vramWarning` instead of being silently downgraded; an actual OOM is classified `OUT_OF_MEMORY` with guidance (reduce resolution/batch, smaller model, close GPU apps) and never auto-retried.

### Image-to-image

Supported when the backend has `LoadImage`/`ImageScale`/`VAEEncode`. Pass a reference image (data URL, absolute URL, or a same-origin `/api/assets/...` URL) plus a `denoise` strength (0–1); the reference is scaled to the target resolution, VAE-encoded, and partially denoised. If the reference cannot be used, the request fails with `INVALID_REQUEST` — the image is never silently discarded.

### Batch generation

`batchSize` 1–4 produces one real persisted asset per image; every output gets its own `/api/assets/images/...` URL and metadata. A failed batch item is reported as a failure; no placeholder is substituted.

### Limitations

- Generation speed depends on GPU: SD 1.5 on a GTX 1070 is roughly 5–20 s per image at 512–768 px; Flux-class models are not recommended on 8 GB VRAM.
- 1024×1024 on 8 GB VRAM can OOM for SD 1.5; prefer 768×768 or below for reliability.
- If ComfyUI is offline, generation reports `BACKEND_UNAVAILABLE` — start ComfyUI to enable local image generation; Null Sector never launches it itself.
- Generated files are copied into the local asset directory (`data/assets/images/`, or `NULL_SECTOR_ASSET_DIR`) so they survive backend output-folder cleanup.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express/Vite development server |
| `npm run lint` | Run the TypeScript compiler in no-emit mode |
| `npm run build` | Build the Vite client and bundled server |
| `npm start` | Start the bundled production server |
| `npm run clean` | Remove generated build output |
| `npm run electron:dev` | Build and launch the standalone Electron shell |
| `npm run electron:build` | Build the Windows standalone installer |

## Production readiness model

Shot readiness is derived from the existing `FilmProject` data rather than stored as a second state system. `src/utils/shotReadiness.ts` evaluates screenplay coverage, dialogue, references, character and location locks, cinematography, prompts, generation jobs, visual takes, master approval, audio, music/SFX, continuity, and validation issues.

The resulting shot states are:

- `NOT READY`
- `IN PROGRESS`
- `READY FOR GENERATION`
- `TAKES AVAILABLE`
- `MASTER APPROVED`
- `PRODUCTION READY`

The same readiness source calculates scene summaries, film-level production health, and deterministic scene recommendations. Recommendations can open the existing Shot List filtered to a scene and readiness condition without duplicating shot state or changing generation providers.

## Zero-Budget Mode

Zero-Budget Mode is preserved as a first-class project setting. The application keeps fallback and local-friendly paths available when paid or provider-backed generation is unavailable. Configure an API key only when you want to use the corresponding Gemini-backed capabilities; core project planning, review, readiness, continuity, and matrix workflows remain part of the local application.

## Architecture

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, and Lucide icons
- **Server:** Express with Vite middleware and a WebSocket endpoint for the Live Voice Director
- **Project model:** `src/types/film.ts`
- **API client:** `src/services/apiClient.ts`
- **Readiness and recommendations:** `src/utils/shotReadiness.ts`
- **Demo project:** `src/data/theLastSignalDemo.ts`
- **Application shell:** `src/App.tsx`

The UI uses controlled workspaces and callback-based mutations. `App.tsx` owns the active `FilmProject`; feature components render and request updates through callbacks. This keeps Shot Designer behavior, generation providers, and project state centralized.

## Repository layout

```text
src/
  components/       Film production workspaces and review panels
  data/             Demo project data
  services/         API client and provider integrations
  types/            Shared film project model
  utils/            Readiness, rendering, and audio helpers
server.ts           Express API, Gemini routes, Vite middleware, and WebSocket server
```

## Validation

Before submitting changes, run:

```bash
npm run lint
npm run build
git diff --check
```

The production build may report a large-client-chunk warning from Vite; this is currently informational and does not fail the build.

## Configuration and security

- Do not commit `.env` files or API keys.
- Use `.env.example` as the configuration template.
- Provider routes fail safely when `GEMINI_API_KEY` is not configured.
- Review generated assets and external fallback URLs before using them in a public production deliverable.
