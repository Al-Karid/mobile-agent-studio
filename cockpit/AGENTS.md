# Cockpit conventions

- **No inline features.** Screens orchestrate; features live in dedicated
  modules:
  - stateful logic → `src/hooks/` (e.g. `use-correction.ts`)
  - API / pure logic → `src/lib/`
  - reusable UI blocks → `src/components/`
- Expo HAS CHANGED — read the exact versioned docs at
  https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Auth

- **Every screen except `login` is behind `Stack.Protected`** in
  `src/app/_layout.tsx`. The guard flips on `useAuthStore` status
  (`loading` → `signedIn`/`signedOut`); the store's `boot()` validates any
  stored token against `GET /api/auth/me` at app start.
- The session token lives in `expo-secure-store` (`lib/api.ts`
  `getToken`/`setToken`). Every `fetch` in `lib/api.ts` goes through
  `withAuth()` which attaches `Authorization: Bearer <token>`. Never call the
  API without it.
- Login flow: `src/app/login.tsx` (email/password, Google/GitHub disabled
  placeholders). **All screens are behind the auth gate — `login` is the only
  one outside `Stack.Protected`** and must stay the first-declared unprotected
  screen (else a `formSheet` becomes the signed-out initial route — see repo
  AGENTS.md pitfalls). Default dev account is `al.cisse@revalys.com` /
  `password1234` (server-seeded).
- **The server URL is `.env`-only** (`EXPO_PUBLIC_API_URL` in `lib/settings.ts`)
  — there is no in-app editing path.
- Settings (`/settings`) holds the user's **default agent** (cline/codex/claude)
  plus each agent's **model** (provider-constrained pickers) and **API keys**
  (masked on the server). Built with **RN components** (`Pressable` segmented
  controls + a `Modal`-based model dropdown, `ActivityIndicator` buttons).
  `new.tsx` pre-selects the default agent and lets the user override per
  project (dry-run/cline/codex/claude).
- AI provider settings live in `/settings`: the user's **default agent**
  (cline/codex/claude), each agent's **model**, and per-agent **API keys** —
  saved via `GET/PUT /api/settings/providers` (server masks keys, blank key =
  keep existing). The server defaults a new project's agent to the owner's
  `agent.default` setting. Sign-out lives there too.

## Platform

- **iOS-only app.** No `Platform.OS` branches, no Android-specific fallbacks or
  `.android`/`.ios` file splits. Native iOS sheets
  (`presentation: "formSheet"`) are the norm.

## UI — React Native components only (no `@expo/ui`)

- **All UI is plain React Native** (`View`, `Text`, `Pressable`, `TextInput`,
  `ScrollView`, `ActivityIndicator`, `Alert`, `Modal`, …) plus
  `@expo/vector-icons` `Ionicons`. There is **no `@expo/ui` dependency** — do
  not add it back.
- Buttons are `Pressable`s styled to match the app (primary = dark filled pill,
  ghost = bordered white, danger = red-bordered). Busy states use
  `ActivityIndicator`; pressed feedback via `({ pressed }) => …` opacity.
- Confirmations use RN `Alert.alert` with a destructive button (sign-out in
  `/settings`, Danger Zone delete).
- Dropdowns / pickers (e.g. the model pickers in `/settings`) are a `Pressable`
  row that opens a `Modal` option list.
- **Sheets**: formSheet screens render their own in-content header
  (`src/components/sheet-header.tsx`, RN ✕ `Pressable`) — never use a native
  header inside a formSheet (react-native-screens #3092 / #4275 hide content).
