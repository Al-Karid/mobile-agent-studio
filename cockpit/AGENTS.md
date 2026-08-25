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

## UI — mainly native SwiftUI via `expo/ui`

- Prefer **`@expo/ui/swift-ui`** native controls over hand-rolled RN ones:
  `Button`, `Image` (`systemName` SF Symbols), `Label`, `Toggle`, `Picker`,
  `TextField`, `VStack`/`HStack`, … wrapped in a `Host` (use `matchContents`
  to size the host to its content).
- Apply styling via `@expo/ui/swift-ui/modifiers`
  (`buttonStyle`, `buttonBorderShape`, `controlSize`, `tint`, `frame`,
  `padding`, `disabled`, `accessibilityLabel`, …).
- RN primitives (`View`, `Text`, `ScrollView`, `TextInput`) are still fine for
  layout and text content — reach for SwiftUI when the platform has a real
  native control (buttons, toggles, segmented pickers, …).
- Prefer SF Symbols through SwiftUI `Image systemName` / `Label` over icon
  fonts (`@expo/vector-icons`) or `expo-symbols`.
- **Sheets**: formSheet screens render their own in-content header
  (`src/components/sheet-header.tsx`) with a SwiftUI close button — never use a
  native header inside a formSheet (react-native-screens #3092 / #4275 hide
  content).
