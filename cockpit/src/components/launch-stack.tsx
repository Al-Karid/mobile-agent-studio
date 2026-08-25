import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { TimelineEventItem } from "@/lib/events";
import { EventRow } from "@/components/event-row";

/**
 * One grouped launch-history card. Collapsed by default (rocket + summary);
 * tap to expand into the real per-event rows (`launching` / `exp://` /
 * `App stopped`). Spins while a launch is ongoing. Shows "running" only when
 * the project is actually launched (server truth, passed as a prop) — a stale
 * exp:// event after a hard stop must not look alive.
 */
export function LaunchStack({
  events,
  running,
}: {
  events: TimelineEventItem[];
  running: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const launches = events.filter(
    (e) => e.type === "ready" && e.message.startsWith("exp://")
  );
  const ongoing = events.some((e) => e.ongoing);
  const count = launches.length;
  const label = count > 1 ? `App launched ×${count}` : "App launched";
  // Reflect the CURRENT state of the group: the last event decides "stopped".
  const lastEvent = events[events.length - 1];
  const isStopped = lastEvent?.message === "App stopped";

  // Shimmer: breathing pulse on the "running" label while the app is live.
  const shimmer = useSharedValue(1);
  useEffect(() => {
    if (running) {
      shimmer.value = withRepeat(
        withSequence(withTiming(0.35, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        true
      );
    } else {
      shimmer.value = 1;
    }
  }, [running, shimmer]);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

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
          {label}
          {running || isStopped ? " · " : null}
          {running ? (
            <Animated.Text style={[styles.runningText, shimmerStyle]}>running</Animated.Text>
          ) : isStopped ? (
            <Text style={styles.stoppedText}>stopped</Text>
          ) : null}
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
  runningText: { color: "#2ecc40", fontWeight: "700" },
  stoppedText: { color: "#8a8f98", fontWeight: "700" },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e3e5",
    padding: 10,
    paddingTop: 4,
  },
});
