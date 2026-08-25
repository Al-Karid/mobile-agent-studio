import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createProject, type ProjectPlatform } from "@/lib/api";
import { noApiKeys, useAgentAvailability } from "@/lib/agent-keys";
import { AgentSelector } from "@/components/agent-selector";
import { SheetHeader } from "@/components/sheet-header";
import { PlatformSelector } from "@/components/platform-selector";

/**
 * New Project — presented as a native iOS liquid-glass sheet (formSheet).
 *
 * The sheet has NO native header on iOS (react-native-screens formSheet bugs
 * #3092 / #4275 can hide the content), so the screen renders its own in-content
 * header: ✕ close, title, and the Create action top-right. The transparent
 * background lets the liquid glass show through.
 */
export default function NewProjectScreen() {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("dry-run");
  const [platform, setPlatform] = useState<ProjectPlatform>("ios");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptRef = useRef<TextInput>(null);

  const { settings, enabledAgents } = useAgentAvailability();
  // No AI agent is usable until the user saves at least one API key.
  const noKeysSet = settings ? noApiKeys(settings) : true;

  // Pre-select the user's default agent (set in Settings) for this project,
  // keeping the current pick when usable; else fall back to dry-run.
  useEffect(() => {
    if (!settings) return;
    setAgent((current) =>
      enabledAgents[current] ? current : enabledAgents[settings.agent] ? settings.agent : "dry-run"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  async function submit() {
    if (busy) return;
    if (!name.trim() || !prompt.trim()) {
      setError("Give the project a name and a short description.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProject({ name: name.trim(), prompt: prompt.trim(), agent, platform });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* In-content header (iOS-only app — no native header in the sheet). */}
      <SheetHeader
        title="New Project"
        subtitle="Describe an app and we&apos;ll build it"
        onClose={() => router.back()}
        right={
          <Pressable
            onPress={submit}
            testID="create-project-button"
            disabled={!name.trim() || !prompt.trim() || busy}
            style={({ pressed }) => [
              styles.createButton,
              (!name.trim() || !prompt.trim() || busy) && styles.createDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createText}>Create</Text>
            )}
          </Pressable>
        }
      />

      {/* Fixed-height body (not scrollable) — compact layout sized to the sheet. */}
      <View style={styles.body}>
        <View style={styles.field}>
          <Text style={styles.label}>Project name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Tasks — a minimal kanban board"
            placeholderTextColor="#9CA3AF"
            returnKeyType="next"
            onSubmitEditing={() => promptRef.current?.focus()}
            maxLength={40}
          />
          <Text style={styles.counter}>{name.length}/40</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            ref={promptRef}
            style={[styles.input, styles.textarea]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="What should this app do? Screens, features, data…"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Agent</Text>
          <AgentSelector value={agent} onChange={setAgent} enabledAgents={enabledAgents} />
          {noKeysSet && (
            <Text style={styles.agentHint}>Set an API Key to use an agent</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Platform</Text>
          <PlatformSelector value={platform} onChange={setPlatform} />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent so the iOS 26 liquid glass shows through the sheet.
    backgroundColor: "transparent",
  },
  // Fixed-height (non-scrollable) body — sized to fit the sheet.
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, gap: 14 },
  field: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  counter: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
  },
  textarea: { minHeight: 100, lineHeight: 20 },
  agentHint: { fontSize: 12, color: "#9CA3AF", lineHeight: 16 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
  },
  errorText: { flex: 1, color: "#DC2626", fontSize: 13 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#111",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 76,
  },
  createText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  createDisabled: { opacity: 0.35 },
  pressed: { opacity: 0.8 },
});
