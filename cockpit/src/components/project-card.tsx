import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { Project } from "@/lib/api";
import { useProjectStore } from "@/lib/project-store";
import { statusColor, statusLabel } from "@/lib/status";

/** Statuses that mean "the agent is working right now". */
const WORKING = new Set(["initializing", "generating", "qa", "launching"]);

const AGENT_LABEL: Record<string, string> = {
  "dry-run": "Dry run",
  cline: "Cline",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "just now", "5m ago", "2h ago", then a short date. */
function relativeTime(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(ts);
}

/** Compact platform badge — iOS / Android / Both. */
function PlatformBadge({ platform }: { platform: string }) {
  const ios = platform === "ios" || platform === "both";
  const android = platform === "android" || platform === "both";
  const label =
    platform === "both" ? "Both" : platform === "android" ? "Android" : "iOS";
  const color =
    platform === "android" ? "#3DDC84" : platform === "both" ? "#6d28d9" : "#111111";

  return (
    <View style={styles.platformChip}>
      {ios && <Ionicons name="logo-apple" size={11} color={color} />}
      {android && <Ionicons name="logo-android" size={11} color={color} />}
      <Text style={[styles.platformText, { color }]}>{label}</Text>
    </View>
  );
}

/**
 * One project card — reads its live state from the shared store, so the list
 * reflects generation/launch progress without navigating.
 */
export function ProjectCard({ item }: { item: Project }) {
  const status = useProjectStore((s) => s.details[item.id]?.status ?? item.status);
  const color = statusColor(status);
  const working = WORKING.has(status);

  return (
    <Pressable
      onPress={() => router.push(`/project/${item.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
        <View style={styles.header}>
          {working ? (
            <ActivityIndicator size={12} color={color} />
          ) : (
            <View style={[styles.dot, { backgroundColor: color }]} />
          )}
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.badge, { borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{statusLabel(status)}</Text>
          </View>
        </View>

        <Text style={styles.prompt} numberOfLines={2} ellipsizeMode="tail">
          {item.prompt}
        </Text>

        <View style={styles.footer}>
          <View style={styles.metaGroup}>
            <PlatformBadge platform={item.platform ?? "ios"} />
            {AGENT_LABEL[item.agent] && (
              <View style={styles.agentChip}>
                <Ionicons
                  name={item.agent === "cline" ? "sparkles" : "flash"}
                  size={11}
                  color="#8b5cf6"
                />
                <Text style={styles.agentText}>{AGENT_LABEL[item.agent]}</Text>
              </View>
            )}
            <Ionicons name="time-outline" size={13} color="#9CA3AF" />
            <Text style={styles.meta}>{relativeTime(item.updated_at)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#C4C4C6" />
        </View>
      </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fcfcfb",
    borderWidth: 3,
    borderColor: "#ffffff",
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  cardPressed: { opacity: 0.75 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, fontSize: 17, fontWeight: "700", color: "#111" },
  badge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  prompt: { fontSize: 13, color: "#666", lineHeight: 18 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaGroup: { flexDirection: "row", alignItems: "center", gap: 5 },
  platformChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F2F2F4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  platformText: { fontSize: 12, fontWeight: "600" },
  agentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F0FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  agentText: { fontSize: 12, fontWeight: "600", color: "#6d28d9" },
  meta: { fontSize: 12, color: "#9CA3AF" },
});