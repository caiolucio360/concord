# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Concord is a Discord-style desktop chat app: Go backend (Gin + Postgres + WebSocket), Electron/React client, LiveKit SFU for voice/video/screen share, and a small Rust helper for per-window audio capture on Windows. README, code comments, docs and UI strings are in **Portuguese** — keep new comments/docs in Portuguese to match. Commits use conventional prefixes (`feat:`, `fix:`) with Portuguese messages. **Never add a `Co-Authored-By: Claude` trailer or any Claude/AI attribution to commits or PR descriptions** — the repo owner wants commits authored only by them. New work goes on its own branch (usually a `git worktree` next to the repo) and lands via PR to `main`.

## Commands

### Backend (`backend/`, Go 1.26, module name `gin-quickstart/backend`)
```bash
cp backend/.env.example backend/.env    # once; same file is read by Go and docker compose
scripts/server-up.sh                     # docker compose up (Postgres + LiveKit), build and run backend
go run ./cmd                             # run API only (needs Postgres + LiveKit up; LIVEKIT_API_KEY/SECRET required or it exits)
go build ./... && go vet ./...
go test ./...
go test ./internal/call -run TestName    # single test
```
Migrations in `backend/migrations/` (golang-migrate, `NNNNNN_name.up/down.sql`) are applied automatically on boot.

### Frontend (`frontend/`, Yarn)
```bash
yarn                                     # install
yarn dev                                 # electron-vite dev; VITE_SERVER_URL defaults to http://localhost:8080
yarn lint | yarn typecheck | yarn build  # build = typecheck + electron-vite build
yarn test                                # vitest run (all *.test.ts colocated with sources)
yarn vitest run src/renderer/src/lib/mentions.test.ts   # single file
yarn vitest run -t "test name"                          # single test by name
```

### Release / E2E (`scripts/`, bash — run from Git Bash/WSL/Linux)
- `scripts/build-win.sh http://host:port` — builds Windows `.exe` inside Docker (Rust helper cross-compiled, then `electronuserland/builder:wine`). The server URL is **baked into the build**.
- `scripts/release-win.sh [version]` — bumps `frontend/package.json` version, builds, signs the installer with Ed25519 (`backend/.release-key`), and publishes to the backend's `UPDATES_DIR` served at `/updates/`.
- `scripts/e2e-*.mjs` — Playwright E2E against a running backend + LiveKit (usage in each script's header). Most serve the built renderer over HTTP (`python -m http.server 5174` in `frontend/out/renderer`) in Chromium with fake media (`--use-file-for-fake-audio-capture`); main-process behavior is tested by launching the built Electron app with Playwright's `_electron` and a throwaway `--user-data-dir` (the app is single-instance).
- `scripts/deploy-vps.sh user@host` — cross-compiles the backend for Linux and rsyncs it, migrations, `docker-compose.yml` and `backend/updates/` to `/opt/concord` on the VPS (Caddy in front, `HOST=127.0.0.1`), then restarts the systemd service.
- Hosting (playit tunnels or VPS, `LIVEKIT_NODE_IP`, services): `docs/HOSPEDAGEM.md`.

### CI (`.github/workflows/deploy.yml`)
Every push to `main` runs `go test ./...`, `yarn typecheck && yarn test`, `node --test scripts/next-version.test.mjs` and `cargo test` (native helper). If the repo variable `DEPLOY_ENABLED` is `true`, it then picks the next version (`scripts/next-version.mjs`: one patch above max(published `latest.yml`, `package.json`)), runs `release-win.sh` with the `RELEASE_KEY` secret, and deploys with `deploy-vps.sh`. Merging to `main` therefore ships an auto-update to every installed client.

### Local gotchas (Windows dev machine)
- The checkout uses CRLF (`core.autocrlf`), so `yarn lint` reports thousands of `prettier/prettier Delete ␍` warnings; only real errors matter (`npx eslint <files> -f json` and filter `severity === 2`). Don't run `prettier --write` on existing files — it rewrites every line ending.
- `backend/docker-compose.yml` runs LiveKit with `network_mode: host`, which doesn't carry media on Docker Desktop for Windows (signalling works, ICE never connects). For local call tests run the native `livekit-server.exe` from the LiveKit GitHub release with the same keys/ports, and pass `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` in the environment if `backend/.env` lacks them (the backend refuses to start without them).

## Architecture

### Backend: modular monolith
- `cmd/main.go` is the composition root: it builds every repository → service → handler by hand and registers routes. New modules must be wired there.
- Each domain in `internal/<domain>/` has `model.go` / `repository.go` (pgx) / `service.go` / `handler.go` / `routes.go`. Dependency rule: Handler → Service → Repository → DB. Handlers often take other domains' services for permission checks (e.g. message handler checks server membership/friendship).
- **Realtime**: `internal/websocket` `Hub` is created early and injected into services that publish events (`PublishMessageCreate`, `PublishChannelUpdate`, friend events, etc.). Clients connect at `GET /ws?token=<access>` and `subscribe` to rooms (`channel:`, `conversation:`, `server:`, `user:`, `call:`); `handler.go` validates room access. `client.go`'s read pump routes inbound `call:*` messages (invite/accept/decline/leave/screen/voice) to the call service.
- **Calls** (`internal/call`): call lifecycle/state is kept in memory in the call service (mirrored to `calls`/`call_participants` tables), signalled over the WebSocket. `RestoreActive` rebuilds state on restart; the hub's disconnect handler feeds `HandleDisconnect`. Media never touches Go: `internal/livekit` issues room tokens (`POST /api/calls/:id/token`, participants only) and reverse-proxies `/rtc` to the local LiveKit, so only the backend port needs to be exposed besides LiveKit's UDP/TCP media ports.
- `internal/updates` serves the auto-update folder at `/updates/`. CORS allows any origin because the packaged app loads from `file://` and auth is Bearer-only.

Note: `PLANO_CALLS_WEBRTC.md` and `FRONTEND_PLAN.md` are historical plans (the P2P mesh design was replaced by LiveKit SFU); trust the code over them.

### Frontend: electron-vite (main / preload / renderer)
- **Server URL is a build-time constant**: `VITE_SERVER_URL` → `lib/serverUrl.ts` derives API, WS and LiveKit URLs; `electron.vite.config.ts` uses the same function to inject the CSP `connect-src` into `index.html` and to define `__CONCORD_UPDATE_URL__` / `__CONCORD_UPDATE_PUBKEY__` for the main process. Changing the server means rebuilding.
- `src/main/`: window/tray/background behaviour, screen-share source picker (`setDisplayMediaRequestHandler` answered later by the renderer's modal via IPC `screen-picker:*`; refusing must be `callback(null)` — `callback({})` throws in the main process), auto-updater with Ed25519 signature verification (`updater.ts`, `updateSignature.ts`, `updatePolicy.ts`), and `screenAudio.ts`. Logic is split into pure, unit-tested functions alongside Electron glue.
- `src/preload/index.ts` exposes `window.api` via `contextBridge`. MessagePorts can't cross the bridge, so the screen-audio port is forwarded with `window.postMessage('concord:screen-audio-port', …)`.
- `src/renderer/src/`: `api/` (REST client with token refresh + `ws.ts` WebSocket client), `store/` (Zustand — one store per domain; `callStore` drives the call UI), `components/`, `pages/`, `router.tsx` (HashRouter). Path alias `@renderer` → `src/renderer/src`. Tailwind v4 with tokens in `assets/main.css` (`@theme`).
- **Audio pipelines**:
  - Window-only share audio (Windows): main spawns `resources/win/concord-audio.exe` (from `native/concord-audio`, WASAPI process loopback) → float32 48 kHz stereo PCM on stdout → `PcmChunker` → MessagePort → renderer `lib/windowAudio.ts` → `screenAudioWorklet.ts` (ring buffer `pcmRing.ts`) → published as a LiveKit track.
  - Mic noise suppression: `lib/noiseSuppression.ts` opens each mic through its own `AudioContext` with RNNoise (xiph/rnnoise WASM via `@sapphi-red/web-noise-suppressor`) and a dry path; toggling `noiseSuppressionStore` crossfades live without republishing. The WASM is imported `?inline` (the packaged app runs from `file://`, where `fetch` fails), which needs `assetsInclude: ['**/*.wasm']` in both `electron.vite.config.ts` and `vitest.config.ts`, and the CSP needs `'wasm-unsafe-eval'`.
- `lib/livekit.ts` / `lib/callMedia.ts` wrap `livekit-client` (publishing mic/camera/screen, device selection from `audioDevices.ts`).

### Native helper (`native/concord-audio/`, Rust)
Windows-only binary, cross-compiled from Linux via its `Dockerfile` (`x86_64-pc-windows-gnu`) in `build-win.sh`. Prints `ready` on stdout's first line when capture starts, then raw PCM.
