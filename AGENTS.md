# mobile-agent-studio — agent context

This repo is an **agentic app-builder**: a cockpit (Expo app) + a backend that
runs coding agents to generate Expo apps, then serves them to Expo Go.

> **Read `docs/CONTEXT.md` first** — it holds the settled decisions, the rejected
> alternatives, and the user's constraints. Don't re-litigate settled choices without asking.

## Repo layout

```
cockpit/   Expo app (mobile cockpit: projects → prompt → status → Launch)
server/    Next.js + SQLite orchestrator (API, async jobs, agent adapters, admin UI)
docs/      Architecture & design notes
```

## Architecture principles (do not break these)

1. **The server is the source of truth.** All state lives in files (`server/data/*.db`
   SQLite + git repos in `server/projects/`). Clients (cockpit, admin UI) are disposable
   viewports — they read/validate, they hold nothing durable.
2. **Ports & adapters.** The orchestrator core never talks to a provider directly.
   Swap anything behind a stable contract:
   - `contracts/agent.ts` → `adapters/agents/*` (cline, codex, claude, dry-run)
   - `contracts/validator.ts` → `adapters/validators/*` (none = human, …)
   - model/provider → `.env` + config (OpenAI-compatible, DeepSeek by default)
3. **No long-lived request/agent session.** Every user action creates a *run* in SQLite
   and returns immediately (`202`). A background job executes it; the client follows
   via SSE and can reconnect/replay at any time (offline-safe). Each step is a git
   commit → resume from the last checkpoint after any interruption.
4. **"Expo Go-safe" is a promise.** After generation, every dependency in the
   generated `package.json` must be in the Expo Go allow-list
   (`server/src/lib/expo-go.ts`). Anything outside → flag "requires a development
   build" instead of shipping a broken app.

## How to run & test (server/)

```bash
cd server
npm install
cp .env.example .env      # DeepSeek key already set locally
npm run dev               # http://localhost:3000
npm run build             # TypeScript source of truth (build must stay green)
npm test                  # unit tests (7)
npm run smoke             # dry-run pipeline: generate → git → QA → ready (no API key)
npm run test:launch       # generate + launch end-to-end (needs network: npm install + Metro)
```

**Restart the server after editing any module loaded at boot** — `next dev` does
NOT hot-reload modules imported by the boot queue (adapters, queue, config, expo-go).
If a run fails with a stale flag/option, kill and restart `npm run dev`.

## Cline headless (validated, cline 3.0.57)

```
cline -c <dir> -P deepseek -m deepseek-v4-flash --thinking none --json "<prompt>"
```

- Provider + API key live in `~/.cline` (same config as the VS Code extension). Do NOT pass `-k`.
- `--thinking none` is REQUIRED — DeepSeek V4 Flash streams endless reasoning tokens
  otherwise (slow, costly, floods the run log). Measured: ~$0.03 + ~7 min per simple app.
- Output is line-delimited JSON events; the final `run_result` carries `finishReason` + `totalCost`.

## Conventions

- TypeScript everywhere. `npm run build` is the source of truth for the server.
- Async jobs are single-process for V1 (no Redis/BullMQ). See `server/src/lib/queue.ts`.
- Never commit secrets. `.env` is gitignored; `.env.example` documents the shape.
- DB access goes through `server/src/lib/db.ts` functions, never raw SQL from outside.

## Pitfalls (learned the hard way)

- **Metro ports**: generated apps get a DEDICATED port (8100+, via `findFreePort`).
  Port 8081 is the cockpit's dev Metro — never assign it to a generated app.
- **tsconfig excludes** `projects/` and `data/` — generated projects have no
  node_modules and must never be typechecked by the server build.
- **dry-run** emits a JS app (`App.js`), not TSX — avoids a TypeScript dependency
  for the minimal simulated project.
- **`react-native-worklets`** is allow-listed (reanimated 4 peer dep, bundled in the
  Expo Go default template but missing from the official third-party list).
- **Run logs are truncated to ~100KB** (`appendRunLog`) — a verbose agent can't bloat the DB.
