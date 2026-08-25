import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/build/react-navigation/elements";
import { useProject } from "@/hooks/use-project";
import { useProjectActions } from "@/hooks/use-project-actions";
import { useProjectStore } from "@/lib/project-store";
import { statusColor } from "@/lib/status";
import { EventRow } from "@/components/event-row";
import { DangerZone } from "@/components/danger-zone";

/** Project settings — everything that doesn't belong on the chat page. */
export default function ProjectSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project, error, setProject, setError } = useProject(id);
  const removeProject = useProjectStore((s) => s.removeProject);
  const actions = useProjectActions({
    projectId: id,
    expUrl: project?.exp_url,
    onProjectChange: setProject,
    onError: setError,
    onDeleted: () => {
      // Drop the project from the local store, then leave the settings screen.
      removeProject(id);
      router.replace("/");
    },
  });

  // iOS header is transparent → scroll content must start below it there.
  const headerTopInset = Platform.OS === "ios" ? useHeaderHeight() : 0;

  const status = project?.status ?? "…";
  const running = status === "launched";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: headerTopInset + 16 }]}
    >
      <Text style={styles.section}>Status</Text>
      <View style={[styles.badge, { borderColor: statusColor(status) }]}>
        <Text style={[styles.badgeText, { color: statusColor(status) }]}>{status}</Text>
      </View>

      {running && (
        <Pressable
          onPress={actions.stop}
          disabled={actions.stopping}
          style={[styles.stopBtn, actions.stopping && { opacity: 0.5 }]}
        >
          <Text style={styles.stopText}>{actions.stopping ? "Stopping…" : "Stop the app"}</Text>
        </Pressable>
      )}

      <Text style={styles.section}>Info</Text>
      <Text style={styles.row}>ID: {project?.id}</Text>
      <Text style={styles.row}>Agent: {project?.agent}</Text>
      <Text style={styles.row}>Model: {project?.model}</Text>
      <Text style={styles.row}>
        Created: {project ? new Date(project.created_at).toLocaleString() : ""}
      </Text>
      {project?.exp_url && (
        <Pressable onPress={() => Linking.openURL(project.exp_url!).catch(() => {})}>
          <Text style={[styles.row, styles.mono]}>URL: {project.exp_url}</Text>
        </Pressable>
      )}

      <Text style={styles.section}>Original prompt</Text>
      <Text style={styles.prompt}>{project?.prompt ?? ""}</Text>

      <Text style={styles.section}>Activity</Text>
      {(project?.events ?? []).slice(-50).map((e) => (
        <EventRow key={e.id} type={e.type} message={e.message} />
      ))}

      <DangerZone onDelete={actions.remove} removing={actions.removing} />

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    marginTop: 20,
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    textTransform: "uppercase",
  },
  badge: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeText: { fontWeight: "700", fontSize: 13 },
  stopBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#ff4136",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stopText: { color: "#ff4136", fontWeight: "700", fontSize: 14 },
  row: { marginTop: 6, fontSize: 14, color: "#333" },
  mono: { color: "#4aa3ff" },
  prompt: { marginTop: 6, fontSize: 15, color: "#333", lineHeight: 22 },
  error: { color: "#c00", marginTop: 12, fontSize: 13 },
});
