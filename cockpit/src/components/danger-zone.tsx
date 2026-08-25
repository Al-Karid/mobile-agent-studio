import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
 * Collapsible destructive section: only the red "Danger zone" label is visible
 * until tapped, then the actual delete control + native confirmation dialog
 * are revealed. Confirmation and state live here; the caller just supplies the
 * delete callback.
 */
export function DangerZone({ onDelete, removing = false }: DangerZoneProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.section}>Danger zone</Text>
      </Pressable>

      {expanded && (
        <View style={styles.box}>
          <Host style={styles.deleteHost} matchContents>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  section: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b91c1c",
    textTransform: "uppercase",
  },
  box: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  deleteHost: { alignSelf: "flex-start" },
  hint: { fontSize: 12, color: "#b91c1c", lineHeight: 16 },
});