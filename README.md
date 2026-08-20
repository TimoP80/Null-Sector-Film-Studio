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

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express/Vite development server |
| `npm run lint` | Run the TypeScript compiler in no-emit mode |
| `npm run build` | Build the Vite client and bundled server |
| `npm start` | Start the bundled production server |
| `npm run clean` | Remove generated build output |

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
