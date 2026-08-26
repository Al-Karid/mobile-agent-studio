import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useKeyboardHeight } from "@/hooks/use-keyboard";

/**
 * The input pill's resting clearance above its anchor (screen bottom when the
 * keyboard is hidden, keyboard top when visible). It tucks closer to the
 * keyboard, so the chat list mirrors the delta to keep the gap between the
 * last message and the pill identical in both states.
 */
export const INPUT_PILL_CLEARANCE = { closed: 44, open: 15 } as const;

/**
 * Bottom prompt input — the send button lives inside the pill. Keyboard
 * behavior follows the Expo guide's chat pattern: the bottom padding AND the
 * spacer are driven by the SAME keyboard-height value, so show and dismiss
 * stay perfectly in sync (no flicker).
 */
export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  busy,
  onKeyboardShow,
  placeholder = "Ask for a change…",
  enabled = true,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  onKeyboardShow?: () => void;
  placeholder?: string;
  /** Locked until the project's agent has an API key (see lib/agent-keys). */
  enabled?: boolean;
}) {
  const disabled = value.trim().length === 0 || !enabled;
  const { height, target } = useKeyboardHeight(onKeyboardShow);

  // 44px above the bottom when closed → 15px above the keyboard when open.
  const wrapStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(
      height.value,
      [0, target.value],
      [INPUT_PILL_CLEARANCE.closed, INPUT_PILL_CLEARANCE.open],
      Extrapolation.CLAMP
    ),
  }));

  // Docs pattern: the spacer follows the keyboard height on every frame.
  const spacerStyle = useAnimatedStyle(() => ({
    height: Math.abs(height.value),
  }));

  return (
    <Animated.View style={[styles.wrap, wrapStyle]}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={enabled ? placeholder : "Select a model or set API key"}
          placeholderTextColor="#999"
          multiline
          editable={!busy && enabled}
        />
        <Pressable
          onPress={() => onSend()}
          disabled={disabled || busy}
          accessibilityLabel={enabled ? "Send prompt" : "Locked — set an API key"}
          style={[styles.send, disabled && styles.sendDisabled]}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : enabled ? (
            <Ionicons name="arrow-up" size={17} color="#fff" />
          ) : (
            <Ionicons name="lock-closed" size={15} color="#fff" />
          )}
        </Pressable>
      </View>
      {/* keyboard spacer — grows/shrinks frame-by-frame with the keyboard */}
      <Animated.View style={spacerStyle} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // No background — a narrow centered bar, floated well above the bottom.
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  row: {
    alignSelf: "center",
    width: "95%",
    maxWidth: 440,
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 3,
    borderColor: "#ffffff",
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    backgroundColor: "#fcfcfb"
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingVertical: 8,
    maxHeight: 110,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    margin: 2,
  },
  sendDisabled: { opacity: 0.35 },
});
