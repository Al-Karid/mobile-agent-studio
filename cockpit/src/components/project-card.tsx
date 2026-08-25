import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import type { Project } from "@/lib/api";
import { useProjectStore } from "@/lib/project-store";
import { statusColor, statusLabel } from "@/lib/status";

/**
 * One project card — reads its live state from the shared store, so the list
 * reflects generation/launch progress without navigating.
 */
export function ProjectCard({ item }: { item: Project }) {
  const status = useProjectStore((s) => s.details[item.id]?.status ?? item.status);
  const color = statusColor(status);

  return (
    <Link href={`/project/${item.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.badge, { borderColor: color }]}>
            <Text style={[styles.badgeText, { color }]}>{statusLabel(status)}</Text>
          </View>
        </View>

        <Text style={styles.prompt} numberOfLines={2}>
          {item.prompt}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.meta}>{new Date(item.created_at).toLocaleDateString()}</Text>
          <Ionicons name="chevron-forward" size={16} color="#C4C4C6" />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    // soft shadow → the cards float on the light canvas
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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
  meta: { fontSize: 12, color: "#9CA3AF" },
});