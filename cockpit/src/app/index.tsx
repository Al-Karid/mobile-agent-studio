import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { listProjects, type Project } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  created: "#8a8f98",
  initializing: "#f5a623",
  generating: "#f5a623",
  qa: "#f5a623",
  ready: "#2ecc40",
  launching: "#f5a623",
  launched: "#4aa3ff",
  needs_dev_build: "#ff4136",
  failed: "#ff4136",
  interrupted: "#ff851b",
};

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listProjects()
      .then((p) => {
        setProjects(p);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 4000);
      return () => clearInterval(t);
    }, [load])
  );

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>Can't reach server: {error}</Text>}

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No projects yet. Tap “New” to build your first app.</Text>
        }
        renderItem={({ item }) => (
          <Link href={`/project/${item.id}`} asChild>
            <Pressable style={styles.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={styles.name}>{item.name}</Text>
                <View
                  style={[
                    styles.badge,
                    { borderColor: STATUS_COLORS[item.status] ?? "#999" },
                  ]}
                >
                  <Text style={{ color: STATUS_COLORS[item.status] ?? "#999", fontSize: 11 }}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.prompt} numberOfLines={2}>
                {item.prompt}
              </Text>
            </Pressable>
          </Link>
        )}
      />

      <View style={styles.footer}>
        <Link href="/new" asChild>
          <Pressable style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>New Project</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable style={styles.ghostBtn}>
            <Text style={styles.ghostBtnText}>Settings</Text>
          </Pressable>
        </Link>
      </View>
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
  footer: { flexDirection: "row", gap: 10, marginTop: 12 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghostBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  ghostBtnText: { color: "#111", fontWeight: "600", fontSize: 15 },
});
