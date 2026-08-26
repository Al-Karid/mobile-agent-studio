---
name: expo-liquid-glass-bottom-sheet
description: Use when building an iOS bottom sheet with the liquid-glass look in Expo Router - native formSheet presentation with transparent contentStyle (iOS 26 glass shows through), in-content SheetHeader (never a native header), frosted pill/card styling, BlurView+gradient glass fallback, and the Stack.Protected stuck-modal pitfall.
---

# Liquid Glass Bottom Sheet (Expo Router / iOS)

## Overview — two ways to get "liquid glass"

1. **Native iOS 26 formSheet** (this project's approach): the OS renders the liquid-glass material behind the sheet. You supply a route with `presentation: "formSheet"` and a **transparent** `contentStyle` so the glass shows through your content. Best fidelity, zero JS work — but iOS-only (the material is rendered by the OS).
2. **Custom glass fallback** (BlurView + gradient feather): for Android or pre-iOS-26, where there is no native material. See §5.

Only the native approach lets you drop in `expo-blur`/`LinearGradient` as *optional* accents; the sheet itself is just a route.

## 1. Register the sheet route (Stack.Screen options)

The sheet lives in the **stack layout** that owns the route (e.g. `app/_layout.tsx`):

```tsx
<Stack.Screen
  name="new"
  options={{
    title: "New Project",
    // iOS-only app: no native header in the sheet — the screen renders its own
    // in-content header (✕ + title + Create). A native header inside a formSheet
    // is buggy in react-native-screens (#3092, #4275) and can hide the content.
    headerShown: false,
    presentation: "formSheet",
    gestureEnabled: false,
    sheetGrabberVisible: false,
    sheetAllowedDetents: [0.6],
    sheetInitialDetentIndex: 0,
    // transparent content lets the iOS 26 liquid glass show through
    contentStyle: { backgroundColor: "transparent" },
    sheetLargestUndimmedDetentIndex: -1,
  }}
/>
```

Key lines:
- `contentStyle: { backgroundColor: "transparent" }` — **the** line that makes it liquid glass. Without it the sheet has an opaque card background and no glass.
- `headerShown: false` — mandatory; a native header in a formSheet is buggy (react-native-screens #3092/#4275) and can hide the sheet content.
- `sheetAllowedDetents: [0.6]` + `sheetInitialDetentIndex: 0` — a single fixed detent. Multiple detents are allowed (fractional or point values); the index picks the opening one.
- `sheetLargestUndimmedDetentIndex: -1` — every detent is dimmed (the page behind stays visibly dimmed at all detents).
- `sheetGrabberVisible: false` + `gestureEnabled: false` — hide the grabber and disable swipe-to-dismiss for modal flows that must be completed deliberately (the in-content ✕ is the close affordance).

## 2. The screen: transparent container + in-content header

```tsx
// app/new.tsx — presented as a native iOS liquid-glass sheet (formSheet)
export default function NewProjectScreen() {
  // ...
  return (
    <View style={styles.container}>
      <SheetHeader
        title="New Project"
        subtitle="Describe an app and we'll build it"
        onClose={() => router.back()}
        right={<Pressable onPress={submit} style={styles.createButton}>...</Pressable>}
      />
      {/* Fixed-height (non-scrollable) body — sized to fit the sheet. */}
      <View style={styles.body}>...fields...</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent so the iOS 26 liquid glass shows through the sheet.
    backgroundColor: "transparent",
  },
  // Fixed-height (non-scrollable) body — sized to fit the sheet.
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, gap: 14 },
});
```

The screen itself has **no native header** — it renders `SheetHeader` as its first child. Content over the glass uses **white cards with hairline borders** (see §4), which read as "frosted" on top of the translucent material.

## 3. The in-content SheetHeader component

Rules that keep it reliable over liquid glass:

- `flexShrink: 0` + `zIndex: 1` — a formSheet ScrollView can otherwise be laid out **over** the header (react-native-screens Fabric quirk). Never let the header shrink or fall beneath scroll content.
- The ✕ close button is a **white circle with a hairline border** — it reads as a frosted control floating on the glass.
- `right` slot for the primary action (e.g. a black "Create" pill).
- Always render it as the FIRST child, above any scrollable body.

```tsx
interface SheetHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
  closeTestID?: string;
}

export function SheetHeader({ title, subtitle, onClose, right, style }: SheetHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <Pressable onPress={onClose} hitSlop={8}
        style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
        accessibilityRole="button" accessibilityLabel="Close">
        <Ionicons name="close" size={17} color="#1C1C1E" />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    flexShrink: 0,   // never let scroll content lay over the header
    zIndex: 1,
  },
  closeButton: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  closePressed: { opacity: 0.6 },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, color: "#111" },
  subtitle: { marginTop: 2, fontSize: 13, color: "#6B7280" },
});
```

## 4. Glass styling — frosted pill + white cards

On top of the native glass, the project uses two "frosted" techniques (pure style, no extra deps):

**Frosted pill** (the chat input): a wide white hairline border + near-white fill + large radius reads as a frosted glass bar even without blur:

```tsx
row: {
  alignSelf: "center",
  width: "95%",
  maxWidth: 440,
  flexDirection: "row",
  alignItems: "flex-end",
  borderWidth: 3,
  borderColor: "#ffffff",   // white "glass edge" highlight
  borderRadius: 22,
  paddingLeft: 14, paddingRight: 4, paddingVertical: 4,
  backgroundColor: "#fcfcfb", // near-white translucent-looking fill
},
```

**White cards** (sheet fields): inputs and controls sit on white cards with hairline `#E5E7EB` borders and radius ~14, so they look "floating" over the glass:

```tsx
input: {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 14,
  paddingHorizontal: 14, paddingVertical: 12,
  fontSize: 15, color: "#111",
},
```

Field labels are small, uppercase, spaced: `fontSize: 12, fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6`.

## 5. Custom glass backdrop (fallback — Android / pre-iOS-26)

When there is no native liquid-glass material, fake it with a `BlurView` band + a `LinearGradient` feather. **A single `BlurView` has a hard rectangular edge** — Expo Go / RN 0.86 has no gradient-mask support (`maskImage` is not implemented), so the feather is a gradient OVERLAY on top that fades in from the page background color:

- Blur intensity must be **visible** (≈45). At low values (e.g. 6) the blur is invisible and the only visible thing is the gradient's solid top edge — which reads as a sharp line.
- The overlay starts solid at the band's top, colored to exactly match the page background, then fades to transparent (3 stops for smoothness).
- Start the band above the visible area (`top: -48`) so the feather zone is tall and gradual.
- `pointerEvents="none"` so it never intercepts taps.

```tsx
<View pointerEvents="none" style={styles.blurBackdrop}> {/* absolute: top:-48, left:-12, right:-12, bottom:0 */}
  <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />
  <LinearGradient
    colors={["#f5f5f7", "rgba(245,245,247,0.6)", "rgba(245,245,247,0)"]}
    locations={[0, 0.3, 0.65]}
    style={StyleSheet.absoluteFill}
  />
</View>
```

## 6. Present & dismiss

- Present: `router.push("/new")` (or `router.push(`/project/${id}/settings`)` for a sheet with params). It becomes a native modal over the current screen.
- Dismiss: `router.back()` from the sheet screen (the in-content ✕ calls it). Because `gestureEnabled: false`, swipe-down is disabled — the ✕ is the only affordance, so the flow can't be abandoned accidentally.

## Critical pitfall — Stack.Protected + formSheet = stuck root modal

When signed out, expo-router filters out the guarded screens and the **FIRST remaining `<Stack.Screen>` in JSX order becomes the initial route**. If a `formSheet` modal is declared before the login screen, the app boots into a **root modal with nothing beneath it** — it can't be dismissed (`router.back()` has no history, nothing to swipe to).

Rules:
- The login screen must be the **first declared non-protected** screen.
- Never put a `formSheet` screen outside the auth guard, and never before the login screen in JSX order.
- Keep sheet routes inside `Stack.Protected` so they only exist while signed in.

## Checklist

1. `presentation: "formSheet"` + `contentStyle: { backgroundColor: "transparent" }` (the glass).
2. `headerShown: false` — never a native header in the sheet (#3092/#4275).
3. In-content `SheetHeader`: ✕ white circle, title, subtitle, optional right action; `flexShrink: 0` + `zIndex: 1`.
4. Screen container background transparent; content = white cards with hairline borders.
5. `gestureEnabled: false` + `sheetGrabberVisible: false` for deliberate flows; detents sized to the content.
6. Login declared first outside `Stack.Protected` — a formSheet must never be the initial route.
7. TypeScript passes: `npx tsc --noEmit`.

## Common pitfalls

1. **Opaque `contentStyle`** — no glass; the sheet is a plain card. The transparent background is the whole trick.
2. **Native header in the sheet** — react-native-screens bugs #3092/#4275 can hide the content entirely. Always `headerShown: false` + an in-content header.
3. **Scroll content over the header** — the Fabric layout quirk lays the ScrollView over the header; fix with `flexShrink: 0` + `zIndex: 1` on the header.
4. **formSheet as the first route when signed out** — boots into an undismissable root modal (see the Stack.Protected pitfall).
5. **Low `BlurView` intensity in a custom backdrop** — the "sharp border" users see is the gradient tint's edge, not the blur. Use ≈45.
6. **Relying on a gradient mask** — `maskImage` is not implemented in RN 0.86 / Expo Go. Feather with an overlay gradient instead.

## Related

- `expo-chat-thread-floating-input` — the frosted floating input pill + BlurView/gradient feather, and `keyboardDismissMode` interplay with sheets.
- `expo-bottom-sheets` — @gorhom bottom sheets (for Android / cross-platform); the native formSheet is the iOS-first alternative used here.
- `ios-transparent-header` — transparent-header offset for the screens the sheet is presented over.
