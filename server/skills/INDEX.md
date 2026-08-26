# Shared skills — generated Expo apps

This library holds pattern guides for building Expo apps that run in **Expo Go**
(`expo-*` modules + the official Expo Go third-party list — no development build).

## ⚠️ SELECTIVE-USE RULE (read first)

- Read and follow **ONLY the skill(s) whose description matches the current task**.
- **Never** read or apply all skills — applying unrelated skills produces wrong code.
- When a task does not match any skill, work without skills.
- These files are **instructions, not app code**: never import, bundle, copy into
  `src/`, or modify them. They are gitignored and not part of the app.

## Skills

### Official Expo skills (from `expo/skills` — curated, Expo Go-safe)

| Skill | When to use | Deps required |
|---|---|---|
| `expo-overview` | Entry point for ANY Expo task — load FIRST; routes to the right skill and owns shared setup rules. | none |
| `expo-project-structure` | Scaffolding / laying out a new Expo Router app, or deciding where a file lives. | none |
| `expo-router` | Navigation & routing: file-based routes, groups, dynamic routes, native Stack, modals/formSheets, NativeTabs, headers. | `expo-router` |
| `expo-animation` | Animations, gestures, sheets, screen transitions, press feedback, haptics (Reanimated + Gesture Handler). | `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics` |
| `expo-native-ui` | Native-feeling screens: Apple HIG, semantic colors, SF Symbols, gradients, media, responsive layout. | reanimated/gesture-handler + `expo-*` per feature |
| `expo-design-system` | Design tokens/theme files, reusable component conventions, design-system audits (NativeWind, Tamagui, …). | varies (styling lib) |
| `expo-data-fetching` | ANY network request / API call / data fetching (fetch, React Query, SWR, Router loaders, caching, offline). | none |
| `expo-tailwind-setup` | Tailwind CSS v4 setup (react-native-css + NativeWind v5). | `react-native-css`, NativeWind |
| `expo-dom` | Run web code in a webview on native via Expo DOM components. | `expo-dom` |
| `expo-examples` | Canonical `expo/examples` integrations (~70 `with-*` templates) to adapt. | varies per example |
| `expo-upgrade` | Upgrading Expo SDK versions and fixing dependency issues. | none |
| `expo-skill-feedback` | Submitting feedback on a skill/Expo or controlling telemetry. | none |

### Custom patterns (this project)

| Skill | When to use | Deps required |
|---|---|---|
| `expo-chat-thread-floating-input` | Building a chat/conversation screen with a floating input bar that must follow the keyboard (list viewport ends above the keyboard, constant last-message→input gap). | `expo-*`, `react-native-reanimated`, `react-native-keyboard-controller`, `expo-blur`, `expo-linear-gradient` — all Expo Go-safe |
| `expo-liquid-glass-bottom-sheet` | Presenting a bottom sheet with the iOS liquid-glass look (expo-router `formSheet` + transparent content, in-content `SheetHeader`, frosted styling). | `expo-router` only (+ optional `expo-blur`/`expo-linear-gradient`) |
| `ios-transparent-header` | Making an iOS native-stack header transparent with content offset via `useHeaderHeight()`. | none |

## Adding a skill

- One directory per skill: `server/skills/<name>/SKILL.md` (YAML frontmatter
  `name` + `description`, then the guide). Add a row to the table above.
- Official Expo skills come from the `expo/skills` plugin (`plugins/expo/skills/`).
  Install ONLY Expo Go-safe ones — exclude native/dev-build skills (`expo-ui`,
  `expo-dev-client`, `expo-app-clip`, `expo-brownfield`, `expo-module`,
  `expo-web-to-native`, `expo-migrate-module`) and EAS services (`eas-*`).
- Do NOT add skills that teach dev-build-requiring packages (e.g. `@gorhom/*`),
  `@expo/ui`, or non-Expo tooling.
