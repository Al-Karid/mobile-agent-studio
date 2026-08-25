import { Pressable, StyleSheet, Text, View } from "react-native";
import { AGENT_OPTIONS } from "@/lib/agent-keys";

/**
 * Segmented agent selector (dry-run / cline / codex / claude). Agents without
 * a user-saved API key are disabled; enabledAgents comes from
 * `useAgentAvailability()` (see lib/agent-keys).
 */
export function AgentSelector({
  value,
  onChange,
  enabledAgents,
}: {
  value: string;
  onChange: (id: string) => void;
  enabledAgents: Record<string, boolean>;
}) {
  return (
    <View style={styles.segmented}>
      {AGENT_OPTIONS.map((a) => {
        const active = value === a.id;
        const enabled = enabledAgents[a.id] ?? false;
        return (
          <Pressable
            key={a.id}
            onPress={() => onChange(a.id)}
            disabled={!enabled}
            style={[
              styles.segment,
              active && styles.segmentActive,
              !enabled && styles.segmentDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: !enabled }}
          >
            <Text style={[styles.segmentTitle, active && styles.segmentTitleActive]}>
              {a.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: "#111" },
  segmentDisabled: { opacity: 0.4 },
  segmentTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },
  segmentTitleActive: { color: "#fff" },
});