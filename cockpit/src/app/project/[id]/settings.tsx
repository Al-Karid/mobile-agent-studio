import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/build/react-navigation/elements";
import { useProject } from "@/hooks/use-project";
import { useProjectActions } from "@/hooks/use-project-actions";
import { useProjectStore } from "@/lib/project-store";
import { updateProjectAgent } from "@/lib/api";
import { noApiKeys, useAgentAvailability } from "@/lib/agent-keys";
import { statusColor, statusLabel } from "@/lib/status";
import { ongoingEventId } from "@/lib/events";
import { EventRow } from "@/components/event-row";
import { DangerZone } from "@/components/danger-zone";
import { AgentSelector } from "@/components/agent-selector";

/** One label → value row inside a settings card. */
function InfoRow({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, mono && styles.mono, accent && styles.accent]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

/** Small uppercase header shown at the top of a settings card. */
function CardHeader({ children }: { children: string }) {
  return <Text style={styles.cardHeader}>{children}</Text>;
}

/** Project settings — everything that doesn't belong on the chat page. */
export default function ProjectSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showTech, setShowTech] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const { project, error, setProject, setError } = useProject(id);
  const removeProject = useProjectStore((s) => s.removeProject);
  const actions = useProjectActions({
    projectId: id,
    expUrl: project?.exp_url,
    onProjectChange: setProject,
    onError: setError,
    onDeleted: () => {
      // Drop the project from the local store, then pop back to the root list —
      // dismissing (not pushing a new home) so there's no back button.
      removeProject(id);
      router.dismissAll();
    },
  });

  // iOS header is transparent → scroll content must start below it there.
  const headerTopInset = Platform.OS === "ios" ? useHeaderHeight() : 0;

  const status = project?.status ?? "…";
  const running = status === "launched";

  // Activity events — newest first; hide the noisy Metro port log line.
  const activities = (project?.events ?? [])
    .filter((e) => !(e.type === "log" && /^starting metro on port/i.test(e.message)))
    .slice(-50)
    .reverse();

  // Live spinner: the NEWEST status event matching the current status is ongoing.
  const ongoingId = ongoingEventId(project?.events ?? [], project?.status ?? "");

  // Agent change — selector is locked to agents the user has a key for.
  const { settings, enabledAgents } = useAgentAvailability();
  const noKeysSet = settings ? noApiKeys(settings) : true;
  const [agent, setAgent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);

  // Keep the selector in sync with the server until the user edits it.
  useEffect(() => {
    if (project && !dirty) setAgent(project.agent);
  }, [project?.agent, dirty]);

  function changeAgent(a: string) {
    setAgent(a);
    setDirty(true);
  }

  async function saveAgent() {
    if (savingAgent || !dirty || !enabledAgents[agent]) return;
    setSavingAgent(true);
    try {
      const updated = await updateProjectAgent(id, agent);
      // The PATCH returns the bare project — merge in the current history.
      const current = project;
      setProject(
        current
          ? { ...current, ...updated }
          : { ...updated, runs: [], events: [] }
      );
      setAgent(updated.agent);
      setDirty(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingAgent(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: headerTopInset + 16 }]}
    >
      {/* Header: project name + status pill */}
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {project?.name ?? "Project"}
        </Text>
        <View style={[styles.badge, { borderColor: statusColor(status) }]}>
          <Text style={[styles.badgeText, { color: statusColor(status) }]}>
            {statusLabel(status)}
          </Text>
        </View>
      </View>

      {running && (
        <Pressable
          onPress={actions.stop}
          disabled={actions.stopping}
          style={({ pressed }) => [
            styles.stopButton,
            pressed && styles.pressed,
            actions.stopping && styles.stopDisabled,
          ]}
          accessibilityRole="button"
        >
          {actions.stopping ? (
            <ActivityIndicator color="#ff4136" />
          ) : (
            <Text style={styles.stopText}>Stop app</Text>
          )}
        </Pressable>
      )}

      {/* Details */}
      <View style={styles.card}>
        <CardHeader>Details</CardHeader>
        <InfoRow label="Name" value={project?.name ?? "—"} />
        <View style={styles.divider} />
        <InfoRow
          label="Platform"
          value={
            project?.platform === "both"
              ? "iOS + Android"
              : project?.platform === "android"
                ? "Android"
                : "iOS"
          }
        />
        <View style={styles.divider} />
        <InfoRow
          label="Created"
          value={project ? new Date(project.created_at).toLocaleString() : "—"}
        />
      </View>

      {/* Description */}
      <View style={styles.card}>
        <CardHeader>Description</CardHeader>
        <Text style={styles.prompt}>{project?.prompt ?? ""}</Text>
      </View>

      {/* Agent — change which agent runs this project's prompts */}
      <View style={styles.card}>
        <CardHeader>Agent</CardHeader>
        <Text style={styles.hint}>
          The agent runs this project&apos;s prompts. Agents need an API key set in Settings.
        </Text>
        <AgentSelector
          value={agent || project?.agent || "dry-run"}
          onChange={changeAgent}
          enabledAgents={enabledAgents}
        />
        {noKeysSet && <Text style={styles.hint}>Set an API Key to use an agent.</Text>}
        <Pressable
          onPress={saveAgent}
          disabled={!dirty || savingAgent || !enabledAgents[agent]}
          style={[
            styles.primary,
            (!dirty || savingAgent || !enabledAgents[agent]) && styles.primaryDisabled,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>
            {savingAgent ? "Saving…" : dirty ? "Save agent" : "Agent saved"}
          </Text>
        </Pressable>
      </View>

      {/* Technical details — expandable, aimed at developers */}
      <View style={styles.card}>
        <Pressable
          style={styles.cardHeaderRow}
          onPress={() => setShowTech((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showTech }}
        >
          <CardHeader>Technical details</CardHeader>
          <Ionicons name={showTech ? "chevron-up" : "chevron-down"} size={16} color="#8E8E93" />
        </Pressable>
        {showTech && (
          <>
            <View style={styles.divider} />
            <InfoRow label="Agent" value={project?.agent ?? "—"} />
            <View style={styles.divider} />
            <InfoRow label="Model" value={project?.model || "—"} />
            <View style={styles.divider} />
            <InfoRow label="Project ID" value={project?.id ?? "—"} mono />
            {project?.exp_url && (
              <>
                <View style={styles.divider} />
                <Pressable onPress={() => Linking.openURL(project.exp_url!).catch(() => {})}>
                  <InfoRow label="Expo URL" value={project.exp_url} mono accent />
                </Pressable>
              </>
            )}
          </>
        )}
      </View>

      {/* Activity — collapsible, expanded by default, newest first */}
      <View style={styles.card}>
        <Pressable
          style={styles.cardHeaderRow}
          onPress={() => setShowActivity((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showActivity }}
        >
          <CardHeader>Activity</CardHeader>
          <Ionicons
            name={showActivity ? "chevron-up" : "chevron-down"}
            size={16}
            color="#8E8E93"
          />
        </Pressable>
        {showActivity && (
          <>
            <View style={styles.divider} />
            {activities.length === 0 ? (
              <Text style={styles.empty}>No activity yet.</Text>
            ) : (
              activities.map((e) => (
                <EventRow
                  key={e.id}
                  type={e.type}
                  message={e.message}
                  ongoing={ongoingId === e.id}
                />
              ))
            )}
          </>
        )}
      </View>

      <DangerZone onDelete={actions.remove} removing={actions.removing} />

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7" },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  name: { flex: 1, fontSize: 28, fontWeight: "800", letterSpacing: -0.5, color: "#111" },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeText: { fontWeight: "700", fontSize: 13 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB" },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  infoLabel: { fontSize: 14, color: "#8E8E93" },
  infoValue: { flex: 1, fontSize: 14, color: "#111", fontWeight: "600", textAlign: "right" },
  mono: { fontFamily: "Menlo", fontSize: 13, fontWeight: "400" },
  accent: { color: "#4aa3ff" },
  prompt: { fontSize: 15, color: "#333", lineHeight: 22 },
  empty: { fontSize: 14, color: "#8E8E93" },
  hint: { fontSize: 12, color: "#6B7280", lineHeight: 17 },
  primary: {
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: { color: "#fff", fontWeight: "700" },
  stopButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#ff4136",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stopText: { color: "#ff4136", fontWeight: "600" },
  stopDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.8 },
  error: { color: "#c00", fontSize: 13 },
});
