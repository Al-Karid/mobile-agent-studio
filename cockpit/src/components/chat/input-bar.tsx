import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

/**
 * Bottom prompt input. The send button lives INSIDE the pill; the pill sits on
 * a gray band with a soft shadow so it clearly contrasts with the white
 * message background. Keyboard avoidance is handled by the screen via
 * useKeyboardSpacer.
 */
export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  busy,
  keyboardVisible = false,
  placeholder = "Ask for a change…",
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  keyboardVisible?: boolean;
  placeholder?: string;
}) {
  const disabled = value.trim().length === 0;
  return (
    <View style={[styles.wrap, { paddingBottom: keyboardVisible ? 15 : 44 }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // No background — a narrow centered bar, floated well above the bottom.
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 15,
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
