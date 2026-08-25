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
  `password1234` (server-seeded). The server URL is edited in Settings *after*
  login; pre-auth the app uses the default from `lib/settings.ts`
  (`EXPO_PUBLIC_API_URL`).
- AI provider keys are per-account and managed in `/settings` →
  `GET/PUT /api/settings/providers` (server masks saved keys).
  Sign-out lives there too.

## Platform

- **iOS-only app.** No `Platform.OS` branches, no Android-specific fallbacks or
  `.android`/`.ios` file splits. Native iOS sheets
  (`presentation: "formSheet"`) are the norm.

## UI — native-first via `expo/ui`, RN fallback

- **Use native components from `@expo/ui/swift-ui` whenever one is available**:
  `Button`, `Image` (`systemName` SF Symbols), `Label`, `Toggle`, `Picker`,
  `TextField`, `ProgressView`, `ConfirmationDialog`, `Alert`, `VStack`/`HStack`,
  … wrapped in a `Host` (use `matchContents` to size the host to its content).
- Apply styling via `@expo/ui/swift-ui/modifiers`
  (`buttonStyle`, `buttonBorderShape`, `controlSize`, `tint`, `frame`,
  `padding`, `disabled`, `role`, `accessibilityLabel`, `pickerStyle`, …).
- **Fall back to React Native only when `expo/ui` has no matching component**
  (e.g. `View`, `Text`, `ScrollView`, `TextInput` for layout/text content, or
  RN `Alert` where a SwiftUI dialog isn't mounted). Never hand-roll an RN
  control when a native `expo/ui` one exists.
- Prefer SF Symbols through SwiftUI `Image systemName` / `Label` over icon
  fonts (`@expo/vector-icons`) or `expo-symbols`.
- **Sheets**: formSheet screens render their own in-content header
  (`src/components/sheet-header.tsx`) with a SwiftUI close button — never use a
  native header inside a formSheet (react-native-screens #3092 / #4275 hide
  content).
