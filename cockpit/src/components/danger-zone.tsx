import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

interface DangerZoneProps {
  /** Destructive action to run after the user confirms (e.g. delete project). */
  onDelete: () => void;
  /** True while the destructive action is in flight — disables + shows a spinner. */
  removing?: boolean;
}

/**
 * Destructive section styled like the other settings cards: always visible,
 * with the delete button + native confirmation alert. Confirmation state
 * lives here; the caller just supplies the delete callback.
 */
export function DangerZone({ onDelete, removing = false }: DangerZoneProps) {
  function confirmDelete() {
    Alert.alert(
      "Delete project?",
      "This permanently deletes the project, its runs, events and generated app. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Danger zone</Text>
      <View style={styles.divider} />
      <Pressable
        onPress={confirmDelete}
        disabled={removing}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && styles.pressed,
          removing && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        {removing ? (
          <ActivityIndicator color="#ff4136" />
        ) : (
          <Text style={styles.deleteText}>Delete project</Text>
        )}
      </Pressable>
      <Text style={styles.hint}>
        Removes the project, its runs, events and generated app permanently.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  header: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b91c1c",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#fecaca" },
  deleteButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#ff4136",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteText: { color: "#ff4136", fontWeight: "600" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
  hint: { fontSize: 12, color: "#b91c1c", lineHeight: 16 },
});