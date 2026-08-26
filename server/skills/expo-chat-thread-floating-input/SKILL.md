---
name: expo-chat-thread-floating-input
description: Use when building a ChatGPT-style chat thread in Expo/React Native with a floating input bar that follows the keyboard - react-native-keyboard-controller + Reanimated shared values, a list viewport that ends above the keyboard, a constant last-message-to-input gap, and a feathered frosted backdrop.
---

# Chat Thread + Floating Keyboard (Expo / React Native)

## Overview — the core mental model

The iOS keyboard does **not** resize your app's root view. It simply covers the bottom ~300–350px. Two things must react *explicitly*:

1. The **input bar** must rise with the keyboard.
2. The **message list's viewport** must shrink so its bottom edge ends AT the keyboard top.

If only the input rises, `scrollToEnd()` still targets the screen bottom → the last message hides behind the keyboard. If only the list shrinks, the input floats off the screen.

Second rule: the input pill usually sits at different clearances above its anchor (e.g. 44px above the screen bottom when closed, 15px above the keyboard when open). That change **must be mirrored by the list**, or the gap between the last message and the pill grows by `closed - open` px whenever the keyboard is up.

Layout:

```tsx
<View container flex:1>
  <LinearGradient background (absolute fill) />
  <Animated.ScrollView (absolute, top/left/right 0, bottom animated = keyboard-driven)>
    ...timeline bubbles...
  </Animated.ScrollView>
  <View inputFloat (absolute, bottom: 0)>   {/* floating overlay */}
    <ChatInputBar ... />
  </View>
</View>
```

## Dependencies

- `react-native-keyboard-controller` — UI-thread keyboard height via `useKeyboardHandler` worklets.
- `react-native-reanimated` (v3+) — shared values, `Animated.ScrollView`, `useAnimatedStyle`, `interpolate`.
- `expo-blur` + `expo-linear-gradient` — the frosted backdrop behind the input.

## 1. The keyboard hook (the foundation)

One hook owns keyboard metrics as Reanimated shared values so every consumer animates on the UI thread:

- `height` — follows the keyboard **every frame on SHOW**.
- `target` — only grows (the full open height).
- HIDE is **instant**: the first *downward* frame snaps `height` to 0 (no dismiss animation). Direction is detected by comparing the new height against the previous one — **NOT** `onStart` (its direction is unreliable and it blocked the open animation).

```tsx
// hooks/use-keyboard.ts
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { runOnJS, useSharedValue } from "react-native-reanimated";

export function useKeyboardHeight(
  onKeyboardShow?: () => void,
  onKeyboardEnd?: () => void
) {
  const height = useSharedValue(0);
  const target = useSharedValue(300);
  const shown = useSharedValue(false);
  const closing = useSharedValue(false);

  const notify = (h: number) => {
    "worklet";
    if (h > 0 && !shown.value) {
      shown.value = true;
      if (onKeyboardShow) runOnJS(onKeyboardShow)();
    } else if (h <= 0) {
      shown.value = false;
    }
  };

  useKeyboardHandler(
    {
      onMove: (e) => {
        "worklet";
        if (closing.value) return;
        if (e.height < height.value) {
          closing.value = true;      // dismiss → snap straight back down
          height.value = 0;
          shown.value = false;
          return;
        }
        if (e.height > target.value) target.value = e.height; // only grow
        height.value = e.height;
        notify(e.height);
      },
      onEnd: (e) => {
        "worklet";
        closing.value = false;
        height.value = e.height > 0 ? e.height : 0;
        if (e.height > 0 && onKeyboardEnd) runOnJS(onKeyboardEnd)();
      },
    },
    []
  );

  return { height, target };
}
```

Notes:
- `onKeyboardShow` fires on the first frame the keyboard starts rising (immediate response); `onKeyboardEnd` fires once it fully settles open (final exact re-pin).
- You can call the hook **multiple times** (once in the input bar, once in the screen) — `useKeyboardHandler` registers independent reanimated event listeners that all receive the same events.

## 2. Screen: fullscreen list + floating input overlay

```tsx
// app/project/[id].tsx (excerpt)
const scrollRef = useRef<Animated.ScrollView>(null);

const { height: keyboardHeight, target: keyboardTarget } = useKeyboardHeight(
  undefined,
  () => scrollRef.current?.scrollToEnd({ animated: true }) // re-pin after settle
);

const scrollBottom = useAnimatedStyle(() => ({
  // The pill tucks `closed - open` px closer to its anchor as the keyboard
  // rises — mirror that delta so the last-message→pill gap stays constant.
  bottom:
    keyboardHeight.value -
    interpolate(
      keyboardHeight.value,
      [0, keyboardTarget.value],
      [0, INPUT_PILL_CLEARANCE.closed - INPUT_PILL_CLEARANCE.open],
      Extrapolation.CLAMP
    ),
}));

<Animated.ScrollView
  ref={scrollRef}
  style={[styles.messages, scrollBottom]}
  // styles.messages = { position: "absolute", left: 0, right: 0, top: 0 }
  contentContainerStyle={styles.messagesContent} // padding: 16, paddingBottom: ~140
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="interactive"
  onScroll={handleScroll}
  scrollEventThrottle={16}
  onContentSizeChange={handleContentSizeChange}
>
  {timeline.map((item) => <MessageBubble key={item.id} ... />)}
</Animated.ScrollView>

{/* Floating overlay — anchored at the SCREEN bottom; it rises via its own spacer. */}
<View style={styles.inputFloat} pointerEvents="box-none"> {/* absolute, bottom: 0 */}
  <ChatInputBar value={input} onChangeText={setInput} onSend={send}
    onKeyboardShow={() => scrollRef.current?.scrollToEnd({ animated: true })} />
</View>
```

Why this works: the ScrollView is **absolute with an animated `bottom`** — its viewport shrinks upward in lockstep with the keyboard (reanimated `useAnimatedStyle` on the UI thread). `scrollToEnd()` then lands the last message just above the keyboard instead of behind it. `Animated.ScrollView` (from reanimated) is required for the animated style; a plain RN `ScrollView` is not reanimated-aware.

## 3. Floating input bar: spacer + clearance

The bar is transparent — only the pill is visible. Two animated pieces:

- `wrapStyle.paddingBottom` = pill clearance: `interpolate(height, [0, target], [closed, open])`.
- A spacer `<Animated.View style={{ height: height.value }} />` placed AFTER the pill. Because the overlay is anchored to the screen bottom, the spacer grows up into the keyboard area and pushes the pill above it.

```tsx
// components/chat/input-bar.tsx (excerpt)
/** Single source of truth — the list mirrors this delta (see §4). */
export const INPUT_PILL_CLEARANCE = { closed: 44, open: 15 } as const;

export function ChatInputBar({ value, onChangeText, onSend, onKeyboardShow }: Props) {
  const { height, target } = useKeyboardHeight(onKeyboardShow);

  // 44px above the anchor when closed → 15px when open.
  const wrapStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      height.value,
      [0, target.value],
      [INPUT_PILL_CLEARANCE.closed, INPUT_PILL_CLEARANCE.open],
      Extrapolation.CLAMP
    ),
  }));

  // Docs pattern: the spacer follows the keyboard height on every frame.
  const spacerStyle = useAnimatedStyle(() => ({ height: Math.abs(height.value) }));

  return (
    <Animated.View style={[styles.wrap, wrapStyle]}>
      <View style={styles.row}> {/* the pill: multiline TextInput + send button */}
        <TextInput multiline ... />
        <Pressable onPress={onSend}>...</Pressable>
      </View>
      <Animated.View style={spacerStyle} /> {/* keyboard spacer */}
    </Animated.View>
  );
}
```

## 4. The constant-gap math (the bit most implementations get wrong)

After `scrollToEnd`, the last message's bottom sits `contentPadding` above the list's bottom edge. The pill's top sits `h + clearance + pillHeight` above the screen bottom. The gap:

```
gap = (viewportBottom + contentPadding) - (h + clearance + pillH)
```

For the gap to be identical whether the keyboard is up or down, the list's bottom edge must rise by exactly the pill's tuck delta as the keyboard opens:

```
viewportBottom = h - interpolate(h, [0, target], [0, closed - open])
```

| State | last message (from screen bottom) | pill top | gap |
|---|---|---|---|
| hidden | `0 + 140` | `44 + pillH` | `140 − 44 − pillH` |
| visible | `(h − 29) + 140` | `h + 15 + pillH` | `140 − 15 − 29 − pillH` → **same** |

Because both the pill's clearance and the list's bottom edge interpolate with the SAME shared values and delta, the gap is constant at **every frame**, even mid-rise — no wobble.

## 5. Pin-to-bottom without yanking

- `onKeyboardShow` → `scrollToEnd()` immediately (the list starts rising).
- `onKeyboardEnd` → `scrollToEnd()` again once the keyboard settles (final exact re-pin).
- Track `atBottomRef` from `onScroll` and only auto-scroll on `onContentSizeChange` when the user is **already at the bottom** — never yank a reader who scrolled up to re-read history. This also covers new messages and launch-card expand/collapse.

```tsx
const atBottomRef = useRef(true);
const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
  atBottomRef.current =
    layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
};
const handleContentSizeChange = () => {
  if (atBottomRef.current) scrollRef.current?.scrollToEnd({ animated: true });
};
```

## 6. Frosted backdrop behind the floating input

A single `BlurView` has a **hard rectangular edge** — Expo Go / RN 0.86 has no gradient-mask support (`maskImage` is not implemented), so you feather the top edge with a `LinearGradient` overlay ON TOP that fades in from the page background color:

- The blur intensity must be **visible** (≈45). At low values (e.g. 6) the "blur" is invisible and the only visible thing is the gradient's solid top edge — which reads as a sharp line.
- The overlay starts **solid at the band's top**, colored to exactly match the page background, then fades to transparent (3 stops for smoothness).
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

## Checklist

1. Keyboard metrics are Reanimated **shared values** (`height`, `target`) — never React state for frame-by-frame values.
2. HIDE snaps instantly: detect direction by comparing heights, **not** `onStart`.
3. Input bar: spacer `height = height.value` + pill clearance interpolated from an exported `INPUT_PILL_CLEARANCE` constant (single source of truth).
4. List: `Animated.ScrollView` (reanimated), `position: absolute`, animated `bottom = height − pillTuckDelta`.
5. `onKeyboardShow` AND `onKeyboardEnd` both `scrollToEnd`.
6. `atBottomRef` guards the content-size auto-scroll so readers are never yanked.
7. `keyboardShouldPersistTaps="handled"` + `keyboardDismissMode="interactive"` (iOS).
8. Frost: `BlurView` intensity ≈45 + a color-matched gradient feather (never rely on a mask).
9. TypeScript passes: `npx tsc --noEmit`.

## Common pitfalls

1. **Only the input rises** — the last message stays hidden behind the keyboard, because `scrollToEnd()` targets the screen bottom. The list's viewport must shrink too.
2. **Fixed content padding while the pill tucks** — the last-message→pill gap grows by `closed − open` (e.g. 29px) when the keyboard opens.
3. **Using `onStart` for keyboard direction** — unreliable, and it blocked the open animation in practice.
4. **Low `BlurView` intensity** — no visible blur; the "sharp border" the user reports is actually the gradient tint's solid top edge, not the blur.
5. **Snapping content padding via React state** — causes wobble mid-rise; interpolate on the UI thread with the same shared values instead.
6. **Plain `ScrollView` with `useAnimatedStyle`** — RN's `ScrollView` is not reanimated-aware; use `Animated.ScrollView`.

## Related

- `expo-bottom-sheets` — `keyboardBehavior="interactive"` for sheets.
- `ios-transparent-header` — the transparent header under which the chat scrolls (content `paddingTop = useHeaderHeight()`).

