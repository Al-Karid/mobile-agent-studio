---
name: ios-transparent-header
description: Use when adding an iOS transparent header in Expo Router - set headerTransparent on the Stack screen and offset content with useHeaderHeight() padding.
---

# iOS Transparent Header (Expo Router / Native Stack)

Makes the iOS native-stack header transparent so the screen background shows through, while keeping a normal opaque header on Android.

## When to Use

- The user wants a transparent / see-through header on iOS only (e.g. a colored page background extending behind the header).
- A screen already has `headerTransparent: true` and its content is being hidden underneath the header.

## Steps

### 1. Set headerTransparent on the Stack screen (iOS only)

In the stack layout that registers the route (e.g. `app/(client)/_layout.tsx`):

```tsx
<Stack.Screen
  name="wallet"
  options={{
    title: 'Mon Portefeuille',
    headerShown: true,
    headerTransparent: Platform.select({ ios: true, default: false }),
    headerBackButtonDisplayMode: 'minimal',
  }}
/>
```

- Gate it to iOS: the Android native stack already lays content out *below* an opaque header.
- Import `Platform` from `react-native` in the layout file.

### 2. Read the real header height in the screen

In the screen component, use `useHeaderHeight()` from `@react-navigation/elements` (already a dependency of Expo Router apps):

```tsx
import { useHeaderHeight } from '@react-navigation/elements';
import { Platform } from 'react-native';

export default function MyScreen() {
  const headerHeight = useHeaderHeight();
  // iOS header is transparent, so content must start below it there.
  const headerTopInset = Platform.OS === 'ios' ? headerHeight : 0;
  // ...
}
```

`useHeaderHeight()` already includes the status-bar / safe-area top inset, so `paddingTop: headerHeight` places content exactly below the header.

### 3. Offset every content container

Apply `paddingTop: headerTopInset` to anything that would render underneath the header:

- Scroll content: `contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: headerTopInset }}` (FlatList / ScrollView).
- Loading and error states that use `justify-center`: add `style={{ paddingTop: headerTopInset }}` to their container so centered content clears the header.

## Completion Criteria

- [ ] `headerTransparent` is iOS-only (`Platform.select({ ios: true, default: false })`).
- [ ] `useHeaderHeight()` is imported from `@react-navigation/elements` (no hardcoded magic numbers).
- [ ] The top inset is gated by `Platform.OS === 'ios'` to match the layout (no double-padding on Android).
- [ ] Every content container that could slide under the header has `paddingTop: headerTopInset`.
- [ ] TypeScript passes for the changed files (`npx tsc --noEmit`).

## Common Pitfalls

1. **Padding on Android too** — the native stack on Android is not transparent and already reserves header space; adding headerHeight there double-pads. Always gate with `Platform.OS`.
2. **Hardcoded padding** — header height varies by device, font scale and notch. Always use `useHeaderHeight()`.
3. **Setting it on the wrong screen** — `headerTransparent` belongs in the Stack screen options of the layout that registers the route, not in the screen component itself.
4. **Forgetting the scroll container** — the most visible symptom is content hidden behind the header; the FlatList/ScrollView `contentContainerStyle` needs the top inset too.

## Related

- `@react-navigation/elements` — exports `useHeaderHeight` (also `HeaderButton`).
