import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { getProject, type ProjectDetail } from "@/lib/api";
import { useCorrection } from "@/hooks/use-correction";
import { useProjectActions } from "@/hooks/use-project-actions";

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

  const status = project?.status ?? "…";
  const color = STATUS_COLORS[status] ?? "#999";
  const canLaunch = status === "ready" || status === "launched";

  const correction = useCorrection({ projectId: id, status });
  const actions = useProjectActions({
    projectId: id,
    onProjectChange: setProject,
    onError: (m) => setError(m),
  });

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
      {correction.error && <Text style={styles.error}>{correction.error}</Text>}

      {canLaunch && (
        <View style={styles.actionRow}>
          <Pressable onPress={actions.launch} disabled={actions.launching} style={styles.launchBtn}>
            <Text style={styles.launchText}>
              {actions.launching ? "Opening…" : status === "launched" ? "Open again" : "Launch in Expo Go"}
            </Text>
          </Pressable>
          {status === "launched" && (
            <Pressable
              onPress={actions.stop}
              disabled={actions.stopping}
              style={[styles.stopBtn, actions.stopping && { opacity: 0.4 }]}
            >
              <Text style={styles.stopText}>{actions.stopping ? "Stopping…" : "Stop"}</Text>
            </Pressable>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Request changes</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={correction.correction}
        onChangeText={correction.setCorrection}
        placeholder="e.g. Switch to a dark theme and add a second screen…"
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
        editable={!correction.busy}
      />
      <Pressable
        onPress={correction.applyChanges}
        disabled={correction.busy || !correction.correction.trim()}
        style={[
          styles.correctBtn,
          (correction.busy || !correction.correction.trim()) && { opacity: 0.4 },
        ]}
      >
        <Text style={styles.correctText}>
          {correction.busy ? "Working…" : "Apply changes"}
        </Text>
      </Pressable>

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
  actionRow: { marginTop: 16, flexDirection: "row", gap: 10 },
  launchBtn: {
    flex: 1,
    backgroundColor: "#111",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  launchText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  stopBtn: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ff4136",
    alignItems: "center",
  },
  stopText: { color: "#ff4136", fontWeight: "700", fontSize: 15 },
  sectionTitle: { marginTop: 24, fontSize: 13, fontWeight: "700", color: "#666", textTransform: "uppercase" },
  prompt: { marginTop: 6, fontSize: 15, color: "#333", lineHeight: 22 },
  eventRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  eventType: { color: "#999", fontSize: 12, width: 70 },
  eventMsg: { color: "#333", fontSize: 13, flex: 1 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#111",
  },
  textarea: { minHeight: 90 },
  correctBtn: {
    marginTop: 10,
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  correctText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
