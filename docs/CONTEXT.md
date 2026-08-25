# Project context & decisions — mobile-agent-studio

This file captures the *why* — the reasoning and constraints an agent needs to
understand the job without re-litigating settled decisions. `ARCHITECTURE.md` is
the technical design; this file is the human/decision context.

## What this is

A system to build an Expo app from a phone: the user types a prompt in a cockpit
app (Expo), the backend (Next.js on the Mac) runs a coding agent (Cline + DeepSeek),
generates an Expo app, and opens it in Expo Go via a deep link — no local toolchain
visible to the user.

Author: CISSE Alassane Al Moustapha, developer at ARTI (transports), Abidjan, Côte d'Ivoire.

## Why it exists (motivation)

The user wants to prototype and generate simple Expo apps from his iPhone without
opening a laptop. V1 targets: **human validation** (he reviews the app visually in
Expo Go), a **$0-20 total budget**, and **"Expo Go-safe guaranteed"** — every
generated dependency must be in Expo Go, otherwise the app is flagged, never shipped broken.

## Settled decisions (do not re-litigate without asking)

| Decision | Rationale | Rejected alternative |
|---|---|---|
| Next.js + SQLite (better-sqlite3) | server doubles as an admin web UI (global admin + client); one process, one file | bare Node; PostgreSQL/Redis (overkill for one Mac, one user) |
| Ports & adapters (no plugin framework) | ~30-line registry + stable contracts; a new provider = one ~50-100 line adapter | dynamic plugin marketplace |
| Single-process async queue | V1 = one Mac, one user; SQLite is source of truth + git checkpoints | Redis/BullMQ |
| Human visual validation (validator "none") | keeps the backend 100% portable (no macOS simulator); the user is the observer | agent-device (Expo's automated device validator) — deferred |
| No Docker in V1 | Metro↔iPhone + Docker Desktop friction (port mapping, node_modules volumes) | Docker now |
| create-expo-app **default** template | real, feature-complete starting point | "blank" template (faster but bare) — **open: may switch for speed** |
| Agent = Cline CLI + DeepSeek v4-flash, `--thinking none` | cheap (~$0.03/app measured), fast enough | default thinking mode (streams endless reasoning tokens → slow, costly) |

## User preferences & constraints (honor these)

- Execute rather than explain; for a product idea, **feasibility first** — no scaffolding
  without explicit go-ahead.
- Defensive, production-ready code; challenge diagnostics.
- Prefer existing packages/CLIs over custom implementations.
- Cockpit UI in **English** for V1 (explicit choice).
- Budget 0-20$; keep API-key spend minimal.
- Commit in logical batches; **do not push to GitHub without asking** (repo is private, `Al-Karid`).
- Secrets via `.env` + dotenv, never hardcoded.

## Current state (as of the last handoff)

- **Full loop validated**: prompt → create-expo-app → Cline/DeepSeek → QA (Expo Go-safe)
  → `ready`. A real "greet in 5 languages" app was generated at **$0.031**.
- Cline CLI **3.0.57** installed globally; provider/key in `~/.cline`.
- A generated project is at `ready` (id `hello-world-mt7au3w0`); the next action is
  **Launch** to open it in Expo Go (Metro on a dedicated port 8100+).
- 6 local commits, **no push** (per instruction).
- No CI; no `cockpit/AGENTS.md` yet.

## Known open items / next steps

1. **Launch the generated app in Expo Go** — validate the last mile on a real iPhone.
2. **Speed optimization** — the default template is rich → ~7 min per generation.
   Switching to `--template blank` should cut this substantially (open decision).
3. `cockpit/AGENTS.md` for cockpit-specific agent context (minor).
4. CI (run `npm test` + `build` on push) — not set up.
