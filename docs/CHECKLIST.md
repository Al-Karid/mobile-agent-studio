# Adjustment checklist — mobile-agent-studio

Review date: Aug 2026 (post `docs/CONTEXT.md` handoff, full-loop validated).
Each item = one working session. Check it off only when its **acceptance criteria**
pass. Order is by priority/risk, not by effort.

---

## Tier 1 — hardening (do before adding features)

- [ ] **1. Metro orphans across server restarts**
  - Problem: `server/src/lib/metro.ts` tracks children in an in-memory `Map`;
    a server restart orphans live Metro processes while `metro_port` / `exp_url`
    stay in SQLite. The next launch spawns a *second* Metro on a new port
    (port leak + stale URLs).
  - Fix: on boot, probe each project's persisted `metro_port` via `/status`;
    reuse it if it answers, otherwise reap the stale process and free the port.
  - Touch: `server/src/lib/metro.ts`, `server/src/instrumentation.ts`.
  - Acceptance:
    - [ ] Launch → kill server → relaunch → project's `exp_url` still works
      (Metro reused or restarted on the same port; no orphan).
    - [ ] `npm test` green, `npm run smoke` green.

- [ ] **2. Per-project run concurrency guard**
  - Problem: a `correct` run can be queued while a `create`/`generate` run is
    still pending/running; the FIFO queue then runs it against a half-built tree.
  - Fix: reject a new run (400) when the project already has a run in
    `pending`/`running`.
  - Touch: `server/src/app/api/projects/[id]/prompts/route.ts`,
    `server/src/app/api/projects/[id]/launch/route.ts` (+ one `db` helper).
  - Acceptance:
    - [ ] Queuing a second run while one is active → `400` with a clear message.
    - [ ] Re-queuing after the first run is `done`/`failed` → `202` as before.
    - [ ] Unit test for the `db` guard; `npm test` green.

- [x] **3. Wire the correction loop into the cockpit UI**
  - Problem: the server supports corrections (`POST /prompts`, `kind: correct`,
    pipeline re-runs) but `cockpit/src/lib/api.ts` `sendPrompt` is dead code —
    no screen calls it. The core product loop (review → correct → re-run) is
    missing from the UX.
  - Fix: add a prompt box + "Apply changes" button on the project screen
    (`cockpit/src/app/project/[id].tsx`); disabled while a run is active.
  - Touch: `cockpit/src/app/project/[id].tsx`, `cockpit/src/lib/api.ts`
    (already has `sendPrompt`).
  - Acceptance:
    - [x] From a `ready` app, type a change → status goes `generating` → `ready`
      again with the change applied (dry-run: prompt text updates in `App.js`).
    - [x] Button disabled during an active run.
    - [ ] Works on device (Expo Go) — no server change required.
      *(manual: user verifies in Expo Go)*

- [ ] **4. Security boundary decision (explicit, not accidental)**
  - Problem: no auth on any endpoint; any LAN device can `POST /api/projects`
    with `agent=cline` and run arbitrary code on the Mac (auto-approve on).
    Acceptable for a trusted private LAN *if documented as the boundary*.
  - Fix (pick one):
    - [ ] **A (choose this):** shared token — server requires
      `Authorization: Bearer <token>` (`.env` `API_TOKEN`, empty = disabled);
      cockpit sends it (stored in settings). Cheap, keeps single-user simplicity.
    - [ ] **B:** document explicitly in CONTEXT.md as an accepted V1 boundary;
      no code change.
  - Acceptance:
    - [ ] With token set: unauthenticated requests → `401`; cockpit works.
    - [ ] With token empty: behaves exactly as today (no breakage).
    - [ ] `npm test` green.

---

## Tier 2 — cheap hardening

- [ ] **5. Prompt via stdin/temp file, not argv**
  - Problem: `cline --json "<prompt>"` (and codex/claude) interpolate the full
    user prompt + context into argv — bounded by OS argv limits on long prompts.
  - Fix: write the prompt to a temp file (or pipe stdin) and reference it.
  - Touch: `server/src/adapters/agents/*.ts`.
  - Acceptance:
    - [ ] A prompt > ~200KB doesn't break the spawn (unit test with a huge
      string: adapter spawns, no `E2BIG`).
    - [ ] `npm test` green.

- [x] **6. Run-log truncation keeps head + tail, not just tail**
  - Problem: `appendRunLog` keeps only the last ~100KB; the create-expo-app /
    agent startup output (what you debug first) is the first thing lost.
  - Fix: keep first ~20KB + last ~80KB with a marker line.
  - Touch: `server/src/lib/run-log.ts` (pure `capRunLog`, used by all storage
    adapters — also DB-agnostic now that storage is behind Drizzle).
  - Acceptance:
    - [x] Unit test: append > 100KB → log contains the head text *and* the tail
      text.
    - [x] `npm test` green.

- [ ] **7. Align docs with the actual checkpoint behavior**
  - Problem: AGENTS.md / ARCHITECTURE.md say "each step is a git commit /
    resume from last checkpoint"; the code commits once after QA.
  - Fix (pick one):
    - [ ] **A (cheap, better):** add a git commit right after `create-expo-app`
      (before the agent runs) so an interrupted generation resumes from a clean
      scaffold.
    - [ ] **B:** soften the docs to match reality.
  - Acceptance:
    - [ ] `create-expo-app` output is committed before the agent touches the tree.
    - [ ] Docs match implementation; `npm run smoke` green.

- [ ] **8. Expo Go allow-list maintenance path**
  - Problem: `expo-go.ts` is hand-maintained with blanket `@expo/*` /
    `@react-native/*` rules; it will rot silently on SDK bumps.
  - Fix: add `server/scripts/fetch-expo-go-list.ts` (pull the official
    third-party overview, print the diff vs the pinned list) + a CONTEXT note
    that the list is frozen per SDK (57) and must be refreshed on SDK upgrade.
  - Touch: `server/scripts/fetch-expo-go-list.ts`, `server/src/lib/expo-go.ts`.
  - Acceptance:
    - [ ] Script runs offline-safe (prints URL it would fetch, tolerates no
      network) and exits 0.
    - [ ] `npm test` green.

- [ ] **9. SSE: wire it or drop it**
  - Problem: `events` route + pub/sub exist but the cockpit polls REST every
    2.5s; SSE is dead weight.
  - Fix (pick one):
    - [ ] **A:** cockpit project screen opens an `EventSource` for live
      logs/status, keeps polling as fallback on error.
    - [ ] **B:** delete the `events` route + `sse.ts` and make polling the
      single documented path.
  - Acceptance:
    - [ ] Live events arrive without the poll tick (A) or no dead code remains
      (B).
    - [ ] `npm test` green.

---

## Tier 3 — already-open items (opportunistic, no dedicated session)

- [ ] **10. CI** — `npm test` + `npm run build` on push (GitHub Actions).
- [ ] **11. Model escalation** — flash → pro retry when QA fails (V2, documented).
- [ ] **12. Generation speed** — try `create-expo-app --template blank` to cut
  the ~7 min (open decision in CONTEXT.md).

---

## How to run through this checklist

1. Pick the top unchecked item.
2. Branch `fix/<n>-<slug>`, do the work, `npm test` + `npm run build`
   (server) / `tsc` (cockpit) green.
3. Meet the item's acceptance criteria, mark the box, commit.
4. Next item. No parallel items — one working session each.

