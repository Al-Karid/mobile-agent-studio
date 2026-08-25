import { useKeyboardHandler } from "react-native-keyboard-controller";
import { runOnJS, useSharedValue } from "react-native-reanimated";

/**
 * Keyboard metrics for the chat input.
 *
 * SHOW: animated — the input rises with the keyboard (height follows every frame).
 * HIDE: instant — the first *downward* frame snaps the input straight back to its
 * resting position. Direction is detected by comparing the new height against the
 * previous one (NOT onStart, which is unreliable for direction and was blocking
 * the open animation, leaving the input hidden behind the keyboard).
 */
export function useKeyboardHeight(onKeyboardShow?: () => void) {
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
        if (closing.value) return; // already closing: no downward animation
        if (e.height < height.value) {
          // height decreasing → dismiss → snap straight back down
          closing.value = true;
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
      },
    },
    []
  );

  return { height, target };
}
