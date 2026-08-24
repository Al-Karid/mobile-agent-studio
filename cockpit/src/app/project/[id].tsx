import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { getProject, launchProject, type ProjectDetail } from "@/lib/api";

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

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    getProject(id)
      .then((p) => {
        setProject(p);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 2500);
      return () => clearInterval(t);
    }, [load])
  );

  async function launch() {
    if (!id) return;
    setLaunching(true);
    try {
      await launchProject(id);
      // Poll until the server reports an exp:// URL, then open it in Expo Go.
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const p = await getProject(id);
        if (p.exp_url) {
          setProject(p);
          await Linking.openURL(p.exp_url);
          setLaunching(false);
          return;
        }
        if (p.status === "failed") throw new Error("launch failed");
      }
      throw new Error("launch timed out");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLaunching(false);
    }
  }

  const status = project?.status ?? "…";
  const color = STATUS_COLORS[status] ?? "#999";
  const canLaunch = status === "ready" || status === "launched";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.name}>{project?.name ?? "…"}</Text>

      <View style={[styles.status, { borderColor: color }]}>
        <Text style={[styles.statusText, { color }]}>{status}</Text>
      </View>

      {project?.exp_url && (
        <Text style={styles.url} selectable>
          {project.exp_url}
        </Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {canLaunch && (
        <Pressable onPress={launch} disabled={launching} style={styles.launchBtn}>
          <Text style={styles.launchText}>
            {launching ? "Opening…" : status === "launched" ? "Open again" : "Launch in Expo Go"}
          </Text>
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Prompt</Text>
      <Text style={styles.prompt}>{project?.prompt ?? ""}</Text>

      <Text style={styles.sectionTitle}>Activity</Text>
      {(project?.events ?? []).slice(-30).map((e) => (
        <View key={e.id} style={styles.eventRow}>
          <Text style={styles.eventType}>{e.type}</Text>
          <Text style={styles.eventMsg}>{e.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  name: { fontSize: 24, fontWeight: "700", color: "#111" },
  status: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusText: { fontWeight: "700", fontSize: 13 },
  url: { marginTop: 10, fontSize: 13, color: "#4aa3ff" },
  error: { color: "#c00", marginTop: 10, fontSize: 13 },
  launchBtn: {
    marginTop: 16,
    backgroundColor: "#111",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  launchText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  sectionTitle: { marginTop: 24, fontSize: 13, fontWeight: "700", color: "#666", textTransform: "uppercase" },
  prompt: { marginTop: 6, fontSize: 15, color: "#333", lineHeight: 22 },
  eventRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  eventType: { color: "#999", fontSize: 12, width: 70 },
  eventMsg: { color: "#333", fontSize: 13, flex: 1 },
});
