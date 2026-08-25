import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useKeyboardHeight } from "@/hooks/use-keyboard";

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
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  onKeyboardShow?: () => void;
  placeholder?: string;
}) {
  const disabled = value.trim().length === 0;
  const { height, target } = useKeyboardHeight(onKeyboardShow);

  // 44px above the bottom when closed → 15px above the keyboard when open.
  const wrapStyle = useAnimatedStyle(() => ({
    paddingBottom: interpolate(height.value, [0, target.value], [44, 15], Extrapolation.CLAMP),
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
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          editable={!busy}
        />
        <Pressable
          onPress={onSend}
          disabled={disabled || busy}
          accessibilityLabel="Send prompt"
          style={[styles.send, disabled && styles.sendDisabled]}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="arrow-up" size={17} color="#fff" />
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
    borderWidth: 1,
    borderColor: "#e2e3e5",
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111",
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
