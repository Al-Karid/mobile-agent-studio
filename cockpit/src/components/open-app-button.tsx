import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

/** "Open" pill for the chat header — runs the app if stopped, else opens it. */
export function OpenAppButton({
  onPress,
  busy,
  visible,
}: {
  onPress: () => void;
  busy: boolean;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <Pressable onPress={onPress} disabled={busy} style={[styles.btn, busy && styles.btnBusy]}>
      {busy ? (
        <ActivityIndicator size="small" color="#111" />
      ) : (
        <Text style={styles.text}>▶ Open</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#111",
  },
  btnBusy: { opacity: 0.5 },
  text: { fontWeight: "700", fontSize: 13, color: "#111" },
});
