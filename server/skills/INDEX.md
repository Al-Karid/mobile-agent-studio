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

| Skill | When to use | Deps required |
|---|---|---|
| `expo-chat-thread-floating-input` | Building a chat/conversation screen with a floating input bar that must follow the keyboard (list viewport ends above the keyboard, constant last-message→input gap). | `expo-*`, `react-native-reanimated`, `react-native-keyboard-controller`, `expo-blur`, `expo-linear-gradient` — all Expo Go-safe |
| `expo-liquid-glass-bottom-sheet` | Presenting a bottom sheet with the iOS liquid-glass look (expo-router `formSheet` + transparent content, in-content `SheetHeader`, frosted styling). | `expo-router` only (+ optional `expo-blur`/`expo-linear-gradient`) |
| `ios-transparent-header` | Making an iOS native-stack header transparent with content offset via `useHeaderHeight()`. | none |

## Adding a skill

- One directory per skill: `server/skills/<name>/SKILL.md` (YAML frontmatter
  `name` + `description`, then the guide). Add a row to the table above.
- Only Expo Go-safe patterns belong here. Do NOT add skills that teach
  dev-build-requiring packages (e.g. `@gorhom/*`), `@expo/ui`, or non-Expo tooling.
