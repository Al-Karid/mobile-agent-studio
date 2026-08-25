import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "expo-router/build/react-navigation/elements";
import { getProviderSettings, health, saveProviderSettings } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const AGENTS = [
  { id: "cline", title: "Cline" },
  { id: "codex", title: "Codex" },
  { id: "claude", title: "Claude" },
] as const;

const CLINE_PROVIDERS = [
  { id: "deepseek", label: "DeepSeek" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
] as const;

/** Segmented selector (RN) — the app's standard control. */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Dropdown model picker — a pressable row that opens a modal option list. */
function ModelPicker({
  value,
  models,
  onChange,
}: {
  value: string;
  models: string[];
  onChange: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.pickerRow}
        accessibilityRole="button"
        accessibilityLabel="Choose model"
      >
        <Text style={styles.pickerValue} numberOfLines={1}>
          {value}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#8E8E93" />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Model</Text>
            {models.map((m) => {
              const active = m === value;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                  style={styles.optionRow}
                >
                  <Text
                    style={[styles.optionText, active && styles.optionTextActive]}
                    numberOfLines={1}
                  >
                    {m}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={18} color="#111" /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/**
 * Settings — default agent + per-agent model/API key. Normal pushed page;
 * iOS header is transparent so the content pads below it via useHeaderHeight().
 */
export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  const signOut = useAuthStore((s) => s.signOut);

  const [agent, setAgent] = useState("cline");
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [clineProvider, setClineProvider] = useState("deepseek");
  const [clineModel, setClineModel] = useState("");
  const [clineKeys, setClineKeys] = useState<Record<string, string>>({});
  const [clineKey, setClineKey] = useState("");
  const [codexModel, setCodexModel] = useState("");
  const [codexKey, setCodexKey] = useState("");
  const [codexMasked, setCodexMasked] = useState("");
  const [claudeModel, setClaudeModel] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [claudeMasked, setClaudeMasked] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // iOS header is transparent → scroll content must start below it there.
  const headerTopInset = Platform.OS === "ios" ? useHeaderHeight() : 0;

  useEffect(() => {
    if (!signedIn) return;
    getProviderSettings()
      .then((p) => {
        setAgent(p.agent);
        setModels(p.models);
        setClineProvider(p.cline.provider);
        setClineModel(p.cline.model);
        setClineKeys(p.cline.keys);
        setCodexModel(p.codex.model);
        setCodexMasked(p.codex.key);
        setClaudeModel(p.claude.model);
        setClaudeMasked(p.claude.key);
      })
      .catch((e) => {
        setStatus(
          `Couldn't load provider settings: ${e instanceof Error ? e.message : String(e)}`
        );
      });
  }, [signedIn]);

  // A saved model must stay valid for the selected provider/agent; fall back
  // to that list's first option so the model picker always has a selection.
  const clineModels = models[clineProvider] ?? [];
  const clineModelValue =
    clineModel && clineModels.includes(clineModel) ? clineModel : clineModels[0] ?? "";
  const codexModels = models.openai ?? [];
  const codexModelValue =
    codexModel && codexModels.includes(codexModel) ? codexModel : codexModels[0] ?? "";
  const claudeModels = models.anthropic ?? [];
  const claudeModelValue =
    claudeModel && claudeModels.includes(claudeModel) ? claudeModel : claudeModels[0] ?? "";

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await saveProviderSettings({
        agent,
        cline: {
          provider: clineProvider,
          model: clineModel.trim() || undefined,
          apiKey: clineKey.trim() || undefined,
        },
        codex: {
          model: codexModel.trim() || undefined,
          apiKey: codexKey.trim() || undefined,
        },
        claude: {
          model: claudeModel.trim() || undefined,
          apiKey: claudeKey.trim() || undefined,
        },
      });
      setClineKey("");
      setCodexKey("");
      setClaudeKey("");
      const p = await getProviderSettings();
      setAgent(p.agent);
      setModels(p.models);
      setClineKeys(p.cline.keys);
      setCodexMasked(p.codex.key);
      setClaudeMasked(p.claude.key);
      setStatus("Saved");
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setStatus("Testing…");
    try {
      const h = await health();
      setStatus(`Connected — model ${h.model}, agent ${h.defaultAgent}`);
    } catch (e) {
      setStatus(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Ask for confirmation before signing out (destructive action). */
  function confirmSignOut() {
    Alert.alert(
      "Sign out?",
      "You'll need to sign in again to manage your projects and provider keys.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: () => signOut().catch(() => {}) },
      ]
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: headerTopInset + 16 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Default agent */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Default agent</Text>
        <Text style={styles.hint}>New projects are pre-selected to this agent.</Text>
        <Segmented
          options={AGENTS.map((a) => ({ id: a.id, label: a.title }))}
          value={agent}
          onChange={setAgent}
        />
      </View>

      {/* Cline */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cline</Text>

        <Text style={styles.label}>Provider</Text>
        <Segmented
          options={CLINE_PROVIDERS.map((p) => ({ id: p.id, label: p.label }))}
          value={clineProvider}
          onChange={(p) => {
            setClineProvider(p);
            setClineModel((models[p] ?? [])[0] ?? ""); // keep the model valid for the provider
          }}
        />

        <Text style={styles.label}>Model</Text>
        <ModelPicker
          value={clineModelValue}
          models={clineModels}
          onChange={setClineModel}
        />

        <Text style={styles.label}>API key</Text>
        {clineKeys[clineProvider] ? (
          <Text style={styles.masked}>Saved key: {clineKeys[clineProvider]}</Text>
        ) : null}
        <TextInput
          style={styles.input}
          value={clineKey}
          onChangeText={setClineKey}
          placeholder="sk-…"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Codex */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Codex</Text>
        <Text style={styles.hint}>OpenAI Codex — GPT models.</Text>

        <Text style={styles.label}>Model</Text>
        <ModelPicker value={codexModelValue} models={codexModels} onChange={setCodexModel} />

        <Text style={styles.label}>API key</Text>
        {codexMasked ? <Text style={styles.masked}>Saved key: {codexMasked}</Text> : null}
        <TextInput
          style={styles.input}
          value={codexKey}
          onChangeText={setCodexKey}
          placeholder="sk-…"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Claude */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Claude</Text>
        <Text style={styles.hint}>Anthropic Claude Code — Claude models.</Text>

        <Text style={styles.label}>Model</Text>
        <ModelPicker
          value={claudeModelValue}
          models={claudeModels}
          onChange={setClaudeModel}
        />

        <Text style={styles.label}>API key</Text>
        {claudeMasked ? <Text style={styles.masked}>Saved key: {claudeMasked}</Text> : null}
        <TextInput
          style={styles.input}
          value={claudeKey}
          onChangeText={setClaudeKey}
          placeholder="sk-ant-…"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {status && <Text style={styles.status}>{status}</Text>}

      <Pressable
        onPress={save}
        disabled={busy}
        style={({ pressed }) => [
          styles.primary,
          pressed && styles.pressed,
          busy && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save</Text>}
      </Pressable>
      <Pressable
        onPress={test}
        style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={styles.ghostText}>Test connection</Text>
      </Pressable>

      {/* Account */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.hint}>
          {user?.email ?? "Signed in"} · session stored in the iOS keychain
        </Text>
        <Pressable
          onPress={confirmSignOut}
          style={({ pressed }) => [styles.danger, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.dangerText}>Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7" },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#111" },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6 },
  hint: { fontSize: 12, color: "#6B7280", lineHeight: 17 },
  masked: { fontSize: 12, color: "#059669", fontWeight: "600" },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
  },
  segmented: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
  },
  segment: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  segmentActive: { backgroundColor: "#111" },
  segmentText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  segmentTextActive: { color: "#fff" },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerValue: { fontSize: 15, color: "#111", flex: 1, marginRight: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 32,
  },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 4 },
  modalTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  optionText: { fontSize: 15, color: "#333", flex: 1, marginRight: 8 },
  optionTextActive: { color: "#111", fontWeight: "700" },
  status: { color: "#666", fontSize: 13 },
  primary: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  ghost: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  ghostText: { color: "#111", fontWeight: "600" },
  danger: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
  },
  dangerText: { color: "#DC2626", fontWeight: "700" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});
