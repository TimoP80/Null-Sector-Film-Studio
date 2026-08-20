# Changelog

All notable changes to the AI Filmmaking Production Studio are documented here.

## [Unreleased] — 2026-08-20

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
