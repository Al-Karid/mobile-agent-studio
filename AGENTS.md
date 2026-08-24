# mobile-agent-studio — agent context

This repo is an **agentic app-builder**: a cockpit (Expo app) + a backend that
runs coding agents to generate Expo apps, then serves them to Expo Go.

## Architecture principles (do not break these)

1. **The server is the source of truth.** All state lives in files (`server/data/*.db`
   SQLite + git repos in `projects/`). Clients (cockpit, admin UI) are disposable
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
   generated `package.json` must be in the official Expo Go allow-list
   (`server/src/lib/expo-go.ts`). Anything outside → flag "requires a development
   build" instead of shipping a broken app.

## Conventions

- TypeScript everywhere. `npm run build` is the source of truth for the server.
- Async jobs are single-process for V1 (no Redis/BullMQ). See `server/src/lib/queue.ts`.
- Never commit secrets. `.env` is gitignored; `.env.example` documents the shape.
