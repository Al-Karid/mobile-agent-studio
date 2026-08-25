import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

/** Bottom input bar — the single way to send a prompt to the agent. */
export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  busy,
  placeholder = "Ask for a change…",
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  placeholder?: string;
}) {
  const canSend = !busy && value.trim().length > 0;
  return (
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
        disabled={!canSend}
        style={[styles.send, !canSend && styles.sendDisabled]}
      >
        <Text style={styles.sendText}>{busy ? "…" : "↑"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111",
    maxHeight: 120,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.35 },
  sendText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
