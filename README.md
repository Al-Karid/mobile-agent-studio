# mobile-agent-studio

Build an Expo app from your phone. Type a prompt, the backend runs a coding agent
on the Mac, and the finished app opens in Expo Go on the same phone — no local
toolchain, no build step visible to the user.

```
iPhone (cockpit)  ──HTTP/SSE──▶  Mac (server)  ──▶  coding agent (Cline/DeepSeek)
        ▲                                │
        └── deep link exp://… (Expo Go) ─┘
```

## Repo layout

```
cockpit/   Expo app (the mobile cockpit: projects → prompt → status → Launch)
server/    Next.js + SQLite orchestrator (API, async jobs, agent adapters, admin UI)
docs/      Design notes & architecture
```

## Quick start

Server (on the Mac):

```bash
cd server
npm install
cp .env.example .env   # put your DeepSeek API key (already done locally)
npm run dev            # http://localhost:3000
```

Cockpit (on the phone):

```bash
cd cockpit
npm install
npx expo start         # scan QR in Expo Go, set the server URL in Settings
```

## Test & verify (server/)

```bash
cd server
npm test            # unit tests (7)
npm run smoke       # dry-run pipeline (no API key): generate → git → QA → ready
npm run test:launch # generate + launch end-to-end (needs network: npm install + Metro)
npm run build       # TypeScript source of truth
```

Requires the Cline CLI (`npm install -g cline`) — provider/key live in `~/.cline`.

See `docs/ARCHITECTURE.md` for the full design.
