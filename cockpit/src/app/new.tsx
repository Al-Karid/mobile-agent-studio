import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Button, Host, ProgressView, Text as SwiftText } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { createProject, getProviderSettings, type ProjectPlatform } from "@/lib/api";
import { SheetHeader } from "@/components/sheet-header";
import { PlatformSelector } from "@/components/platform-selector";

const AGENTS = [
  { id: "dry-run", title: "Dry run" },
  { id: "cline", title: "Cline" },
  { id: "codex", title: "Codex" },
  { id: "claude", title: "Claude" },
];

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
  // Agents the user has an API key for (dry-run never needs one).
  const [enabledAgents, setEnabledAgents] = useState<Record<string, boolean>>({
    "dry-run": true,
    cline: false,
    codex: false,
    claude: false,
  });
  const [platform, setPlatform] = useState<ProjectPlatform>("ios");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptRef = useRef<TextInput>(null);

  // Pre-select the user's default agent (set in Settings) for this project,
  // and disable agents that have no API key configured yet. An agent is only
  // usable when the user saved a key for it (cline = the provider chosen in
  // Settings); dry-run never needs a key.
  useEffect(() => {
    getProviderSettings()
      .then((p) => {
        const enabled: Record<string, boolean> = {
          "dry-run": true,
          cline: Boolean(p.cline.keys[p.cline.provider]),
          codex: Boolean(p.codex.key),
          claude: Boolean(p.claude.key),
        };
        setEnabledAgents(enabled);
        // Keep the current pick when usable; else the default agent if it has
        // a key; else fall back to dry-run.
        setAgent((current) =>
          enabled[current] ? current : enabled[p.agent] ? p.agent : "dry-run"
        );
      })
      .catch(() => {});
  }, []);

  // No AI agent is usable until the user saves at least one API key.
  const noApiKeys =
    !enabledAgents.cline && !enabledAgents.codex && !enabledAgents.claude;

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
          <Host style={styles.createHost} matchContents>
            <Button
              onPress={submit}
              testID="create-project-button"
              modifiers={[
                buttonStyle("borderedProminent"),
                buttonBorderShape("capsule"),
                controlSize("regular"),
                tint("#111"),
                disabled(!name.trim() || !prompt.trim()),
                accessibilityLabel("Create project"),
              ]}
            >
              {busy ? <ProgressView /> : <SwiftText>Create</SwiftText>}
            </Button>
          </Host>
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
          <View style={styles.segmented}>
            {AGENTS.map((a) => {
              const active = agent === a.id;
              const enabled = enabledAgents[a.id];
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAgent(a.id)}
                  disabled={!enabled}
                  style={[
                    styles.segment,
                    active && styles.segmentActive,
                    !enabled && styles.segmentDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: !enabled }}
                >
                  <Text style={[styles.segmentTitle, active && styles.segmentTitleActive]}>
                    {a.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {noApiKeys && (
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
  segmented: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: "#111" },
  segmentDisabled: { opacity: 0.4 },
  segmentTitle: { fontSize: 14, fontWeight: "700", color: "#374151" },
  segmentTitleActive: { color: "#fff" },
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
  createHost: {
    // Wraps the native SwiftUI Create button tightly (matchContents) so it
    // stays within the header's content padding and never overflows the row.
    alignSelf: "center",
  },
});
