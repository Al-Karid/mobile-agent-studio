import { Platform } from "react-native";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";

/**
 * Smooth keyboard-following spacer for the chat input — the technique from
 * Expo's keyboard-handling tutorial (react-native-keyboard-controller +
 * reanimated): an Animated.View under the input bar whose height tracks the
 * keyboard height frame-by-frame, so the input glides above the keyboard.
 *
 * iOS: the spacer lifts the input. Android: the window already resizes
 * (adjustResize), so the spacer stays 0 to avoid a double shift.
 *
 * `onHeightChange` fires from the UI thread (runOnJS) so the screen can
 * scroll the conversation to the bottom when the keyboard opens.
 */
export function useKeyboardSpacer(onHeightChange?: (height: number) => void) {
  const height = useSharedValue(0);

  useKeyboardHandler(
    {
      onStart: (e) => {
        "worklet";
        height.value = e.height;
        if (onHeightChange) runOnJS(onHeightChange)(e.height);
      },
      onMove: (e) => {
        "worklet";
        height.value = Math.max(e.height, 0);
        if (onHeightChange) runOnJS(onHeightChange)(Math.max(e.height, 0));
      },
      onEnd: (e) => {
        "worklet";
        height.value = Math.max(e.height, 0);
        if (onHeightChange) runOnJS(onHeightChange)(Math.max(e.height, 0));
      },
    },
    []
  );

  const spacerStyle = useAnimatedStyle(() => ({
    height: Platform.OS === "ios" ? height.value : 0,
  }));

  return spacerStyle;
}
