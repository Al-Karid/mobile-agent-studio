# Cockpit conventions

- **No inline features.** Screens orchestrate; features live in dedicated
  modules:
  - stateful logic → `src/hooks/` (e.g. `use-correction.ts`)
  - API / pure logic → `src/lib/`
  - reusable UI blocks → `src/components/`
- Expo HAS CHANGED — read the exact versioned docs at
  https://docs.expo.dev/versions/v57.0.0/ before writing any code.

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
