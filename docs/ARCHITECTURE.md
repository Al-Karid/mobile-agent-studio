# Architecture — mobile-agent-studio

## The loop (what this product does)

```
iPhone (cockpit)                         Mac (server, single Next.js process)
───────────────                          ──────────────────────────────────────
 1. "New project" + prompt                POST /api/projects           → create-expo-app + git init
 2. status "initializing…" ──SSE──▶      run created, job queued
 3. status "generating…"  ──SSE──▶      coding agent (Cline/DeepSeek) writes the app
 4. status "qa…"          ──SSE──▶      tsc/lint + Expo Go-safe validation
 5. status "ready"        ──SSE──▶      done, committed — server idles
 6. tap "Launch"                          POST /api/projects/:id/launch → start Metro
 7. Linking.openURL("exp://…") ──▶       Expo Go loads the bundle from Metro (dynamic port 8100+)
```

The phone never receives the app — it receives a URL, and Expo Go loads the JS
bundle live from the Mac's Metro server. Fast Refresh updates the running app on
every correction.

## Communication (four links, two servers on the Mac)

1. **cockpit ↔ API** — HTTP REST (actions) + SSE (live status/logs).
2. **API → coding agent** — local child process (headless CLI), stdin/stdout.
3. **API → project dir** — file writes + git commits (checkpoints).
4. **Expo Go ↔ Metro (dynamic port 8100+)** — HTTP bundle + WebSocket Fast Refresh.

Only link #1 is visible to the user. The validation sandbox (agent-device) was
deliberately deferred — V1 uses **human visual validation** (the user is the
observer), which makes the backend 100% portable (no macOS-only simulator).

## Offline / resume model

- Every action = a `run` row in SQLite. API returns `202` immediately.
- A background queue executes runs; on boot it marks orphaned `running` runs as
  `interrupted` so the client can resume them from the last git checkpoint.
- The client reconnects, `GET /api/projects/:id` replays full history + status →
  buttons depend on status. No server-side session is kept alive.

## Plugins: ports & adapters (no plugin framework)

The "engine" is a 30-line registry + a JSON config. Contracts:

- `AgentAdapter.run(req) → AsyncIterable<AgentEvent>` — cline / codex / claude / dry-run
- `ValidatorAdapter.validate(dir) → ValidatorResult` — none (human) / future: simulator, device-cloud
- Model/provider = `.env` (OpenAI-compatible) — DeepSeek v4-flash by default, Pro via model routing

Swap = edit `DEFAULT_AGENT` / `DEFAULT_VALIDATOR` in `.env`. New provider = one
adapter file (~50-100 lines). No dynamic loading / marketplace needed for V1.

## Expo Go-safe validation

`server/src/lib/expo-go.ts` holds the official Expo Go allow-list (SDK 57 third-party
libraries + the `expo-*` module convention). After generation, every dependency is
checked; a miss → status `needs_dev_build` (or warning) instead of a broken app.
This is the product's differentiator: "Expo Go-safe guaranteed".

## Model cost (DeepSeek v4, Aug 2026)

| Use | v4-flash | v4-pro |
|---|---|---|
| Build the V1 | ~$0.5-1 | ~$1.5-3 |
| Generate 1 app | ~$0.10-0.25 | ~$0.35-0.70 |
| 1 correction | ~$0.02-0.05 | ~$0.05-0.15 |

Cache hit input is ~30-60x cheaper than miss; the shared template/context maximizes it.

## Decisions log

- **Next.js** (not bare Node): the server doubles as an admin web UI (global admin +
  client view), and matches the user's stack. One process, one SQLite file.
- **better-sqlite3** (not an ORM): synchronous, zero-config, matches the proven
  "centralized internal app" pattern.
- **Single-process queue** (no Redis): V1 runs on one Mac for one user.
- **Human validation only** (no agent-device): removes the macOS/simulator dependency,
  keeps V1 portable. Re-add via `ValidatorAdapter` later.
- **No Docker in V1**: portability is guaranteed by the contracts; Dockerize for a
  VPS later with zero refactor.

## Status model

```
created → initializing → generating → qa → ready → launching → launched
                                            │
                                            ├→ needs_dev_build   (Expo Go-safe miss)
                                            └→ failed / interrupted
```

## TODO / open questions

- Exact Cline headless CLI syntax must be validated (adapter is parameterized).
- Push notifications / native modules → dev-build path (deferred; $99 Apple signing).
- V2: Docker on a VPS, model routing (flash → pro on QA failure), device-cloud validator.
