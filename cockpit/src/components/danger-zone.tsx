import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  ConfirmationDialog,
  Host,
  ProgressView,
  Text as SwiftText,
} from "@expo/ui/swift-ui";
import { buttonStyle, disabled, tint } from "@expo/ui/swift-ui/modifiers";

interface DangerZoneProps {
  /** Destructive action to run after the user confirms (e.g. delete project). */
  onDelete: () => void;
  /** True while the destructive action is in flight — disables + shows a spinner. */
  removing?: boolean;
}

/**
 * Destructive section styled like the other settings cards: always visible,
 * with the native delete button + confirmation dialog. Confirmation state
 * lives here; the caller just supplies the delete callback.
 */
export function DangerZone({ onDelete, removing = false }: DangerZoneProps) {
  const [confirmVisible, setConfirmVisible] = useState(false);

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Danger zone</Text>
      <View style={styles.divider} />
      <Host style={styles.deleteHost}>
        <ConfirmationDialog
          title="Delete project?"
          isPresented={confirmVisible}
          onIsPresentedChange={setConfirmVisible}
        >
          <ConfirmationDialog.Trigger>
            <Button
              onPress={() => setConfirmVisible(true)}
              modifiers={[
                buttonStyle("bordered"),
                tint("#ff4136"),
                disabled(removing),
              ]}
            >
              {removing ? <ProgressView /> : <SwiftText>Delete project</SwiftText>}
            </Button>
          </ConfirmationDialog.Trigger>
          <ConfirmationDialog.Message>
            <SwiftText>
              This permanently deletes the project, its runs, events and
              generated app. This can&apos;t be undone.
            </SwiftText>
          </ConfirmationDialog.Message>
          <ConfirmationDialog.Actions>
            <Button role="cancel" onPress={() => setConfirmVisible(false)}>
              <SwiftText>Cancel</SwiftText>
            </Button>
            <Button
              role="destructive"
              onPress={() => {
                setConfirmVisible(false);
                onDelete();
              }}
            >
              <SwiftText>Delete</SwiftText>
            </Button>
          </ConfirmationDialog.Actions>
        </ConfirmationDialog>
      </Host>
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
  deleteHost: {
    // Fixed frame — no matchContents: a ConfirmationDialog reports an unstable
    // content size to the host, which made the button drift on scroll.
    alignSelf: "flex-start",
    width: 130,
    height: 40,
  },
  hint: { fontSize: 12, color: "#b91c1c", lineHeight: 16 },
});