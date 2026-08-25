import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Stack, router, useFocusEffect } from "expo-router";
import { HeaderButton } from "expo-router/build/react-navigation/elements/Header/HeaderButton";
import { useHeaderHeight } from "expo-router/build/react-navigation/elements";
import { useProjectStore } from "@/lib/project-store";
import type { Project } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  created: "#8a8f98",
  initializing: "#f5a623",
  generating: "#f5a623",
  qa: "#f5a623",
  ready: "#2ecc40",
  launching: "#f5a623",
  launched: "#4aa3ff",
  needs_dev_build: "#ff4136",
  awaiting_input: "#8b5cf6",
  failed: "#ff4136",
  interrupted: "#ff851b",
};

/** One project card — reads its live state from the shared store. */
function ProjectCard({ item }: { item: Project }) {
  const status = useProjectStore((s) => s.details[item.id]?.status ?? item.status);
  const color = STATUS_COLORS[status] ?? "#999";

  return (
    <Link href={`/project/${item.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.badge, { borderColor: color }]}>
            <Text style={{ color, fontSize: 11 }}>{status}</Text>
          </View>
        </View>
        <Text style={styles.prompt} numberOfLines={2}>
          {item.prompt}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function ProjectsScreen() {
  const [error, setError] = useState<string | null>(null);
  const projects = useProjectStore((s) => s.projects);
  const refreshProjects = useProjectStore((s) => s.refreshProjects);

  // iOS header is transparent → content must start below it there.
  const headerTopInset = Platform.OS === "ios" ? useHeaderHeight() + 16 : 0;

  const load = useCallback(() => {
    refreshProjects().catch((e) =>
      setError(e instanceof Error ? e.message : String(e))
    );
  }, [refreshProjects]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 4000);
      return () => clearInterval(t);
    }, [load])
  );

  return (
    <View style={[styles.container, { paddingTop: headerTopInset }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <>
              <HeaderButton
                onPress={() => router.push("/new")}
                accessibilityLabel="New Project"
                testID="new-project-button"
              >
                <Ionicons name="add" size={26} color="#111" />
              </HeaderButton>
              <HeaderButton
                onPress={() => router.push("/settings")}
                accessibilityLabel="Settings"
                testID="settings-button"
              >
                <Ionicons name="settings-outline" size={22} color="#111" />
              </HeaderButton>
            </>
          ),
        }}
      />

      {error && <Text style={styles.error}>Can't reach server: {error}</Text>}

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No projects yet. Tap “New” to build your first app.</Text>
        }
        renderItem={({ item }) => <ProjectCard item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  card: { padding: 14, borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 10 },
  name: { fontSize: 17, fontWeight: "600", color: "#111" },
  badge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  prompt: { marginTop: 6, fontSize: 13, color: "#666" },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  error: { color: "#c00", marginBottom: 10, fontSize: 13 },
});
