# Changelog

All notable changes to the AI Filmmaking Production Studio are documented here.

## [Unreleased] — 2026-09-01

### Added

- Provider-agnostic image-to-video foundation with `VideoGenerationService`, provider registry, prompt construction, capability validation, persistent job storage, runtime execution, and project synchronization.
- Dedicated Image → Video production UI with T2V/I2V controls, provider selection, generation status, and take-ready output handling.
- Durable video job lifecycle with queued, generating, completed, failed, and cancelled states; restart recovery; retry support; stale-completion protection; and idempotent synchronization.
- Real local ComfyUI/LTX integration using LTX v0.9.1, native video output, MP4/H.264 support, WEBP preservation, asset persistence, MIME validation, FFprobe metadata checks, and FFmpeg decode verification.
- Hardware-aware local provider reporting for ComfyUI availability, CUDA/GPU status, VRAM, model verification, supported capabilities, and actionable provider errors.
- Isolated Modal LTX benchmark harness with real NVIDIA L4 T2V/I2V runs, deterministic test inputs, MP4 retrieval, FFprobe/FFmpeg verification, cost measurement, and cleanup documentation.
- Modal provider boundary with HTTPS enforcement, bearer authentication support, explicit `local`/`modal`/`auto` selection semantics, retryable-failure fallback policy, and idempotency headers.
- Isolated Modal HTTP service and worker scaffolding with authenticated job routes, durable Volume-backed state, request limits, bounded queueing, controlled I2V data URLs, model caching, MP4 validation, and deployment documentation.
- Electron packaging configuration, durable external asset-directory support, application icon packaging, and packaged runtime asset-path handling.
- Automated provider, queue, recovery, output-validation, synchronization, cancellation, and resilience coverage.

### Changed

- Expanded `FilmProject`, `ShotTake`, and generation metadata without replacing existing screenplay, shot, readiness, review, or project-management architecture.
- Generation queue and Production Supervisor now expose truthful video-job state, actions, navigation, and historical failure information.
- Settings and AI generation surfaces distinguish configured providers from reachable backends, verified models, and actually available generation capabilities.
- README and environment examples now document local ComfyUI/LTX setup, hardware limitations, Modal benchmarking, optional provider configuration, asset storage, and deployment boundaries.

### Verification

- Real local GTX 1070 LTX inference verified at 864×480 with WEBP and H.264 MP4 output.
- Real Modal L4 LTX benchmark verified for T2V and I2V at 864×480, 24 FPS, 25 frames, with FFprobe and FFmpeg validation.
- Modal HTTP service deployment remains gated until its packaged worker import path and authenticated live smoke tests are fully verified.

### Known limitations

- Modal is not enabled in production by default; the local ComfyUI provider remains the safe operational path and fallback.
- The deployed Modal service still requires final worker packaging/import repair, authenticated T2V/I2V smoke tests, idempotency verification, and a Null Sector end-to-end test before production traffic is enabled.
- Cloud provider registrations remain unavailable until their real APIs are implemented; no fake or synthetic media fallback is used.

## [0.1.0] — 2026-08-20

### Added

- Film-level Production Health Summary with deterministic aggregation for scenes, shots, readiness, master approvals, visual takes, continuity risk, dialogue coverage, rejected takes, and high-priority actions.
- Read-only AI Production Supervisor panel with compact film telemetry and prioritized Next Actions.
- Deterministic scene recommendations for unapproved masters, missing visual takes, continuity issues, missing dialogue, and rejected takes.
- Direct recommendation navigation into the relevant scene and readiness filter in the Shot List / Production Matrix.
- Shot Readiness scoring and detailed per-shot readiness breakdowns.
- Scene-level readiness summaries and Production Matrix readiness indicators.
- Visual Take Review workflow with preview/playback, selection, rejection, approval, and master-take controls.
- Controlled Shot Designer parameter-panel and preview-pane components.

### Changed

- Extended the shared film model with validation issue and rejected-take support.
- Centralized readiness, scene recommendation, and production health derivation in `src/utils/shotReadiness.ts`.
- Preserved existing Shot Designer state ownership, generation behavior, provider integrations, and Zero-Budget Mode.

## [0.0.0] — 2025-01-01

### Added

- Initial AI Filmmaking Production Studio application shell.
- Screenplay, story, character, location, scene, shot, storyboard, dialogue, audio, continuity, timeline, export, and settings workspaces.
- Express/Vite development server with Gemini provider routes and Live Voice Director WebSocket support.
- Demo project data for **The Last Signal**.

[Unreleased]: https://github.com/TimoP80/Null-Sector-Film-Studio/compare/main...HEAD
[0.1.0]: https://github.com/TimoP80/Null-Sector-Film-Studio/compare/29f5cd6...main
