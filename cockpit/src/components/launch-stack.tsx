import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { TimelineEventItem } from "@/lib/events";
import { EventRow } from "@/components/event-row";

/**
 * One grouped launch-history card. Collapsed by default (rocket + summary);
 * tap to expand into the real per-event rows (`launching` / `exp://` /
 * `App stopped`). Spins while a launch is ongoing.
 */
export function LaunchStack({ events }: { events: TimelineEventItem[] }) {
  const [expanded, setExpanded] = useState(false);

  const launches = events.filter(
    (e) => e.type === "ready" && e.message.startsWith("exp://")
  );
  const stopped = events.some((e) => e.message === "App stopped");
  const ongoing = events.some((e) => e.ongoing);
  const count = launches.length;
  const primary = launches.length > 0 ? launches[launches.length - 1].message : "";

  const summary = [
    count > 1 ? `App launched ×${count}` : "App launched",
    primary && `— ${primary}`,
    stopped && "· stopped",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View style={styles.box}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.header}
        accessibilityLabel="Launch history"
        accessibilityState={{ expanded }}
      >
        {ongoing ? (
          <ActivityIndicator size={14} color="#4aa3ff" />
        ) : (
          <Ionicons name="rocket-outline" size={15} color="#4aa3ff" />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {summary}
        </Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#999" />
      </Pressable>
      {expanded && (
        <View style={styles.body}>
          {events.map((e) => (
            <EventRow key={e.id} type={e.type} message={e.message} ongoing={e.ongoing} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e3e5",
    backgroundColor: "rgba(255,255,255,0.6)",
    marginVertical: 4,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
  },
  title: { flex: 1, fontSize: 13, fontWeight: "600", color: "#333" },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e3e5",
    padding: 10,
    paddingTop: 4,
  },
});
