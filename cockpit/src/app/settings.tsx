import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { getApiUrl, setApiUrl } from "@/lib/settings";
import { getProviderSettings, health, saveProviderSettings } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { SheetHeader } from "@/components/sheet-header";

const CLINE_PROVIDERS = [
  { id: "deepseek", label: "DeepSeek" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
] as const;

/**
 * Settings — presented as a native iOS liquid-glass sheet (formSheet).
 * No native header on iOS (same formSheet bugs as New Project), so the screen
 * renders its own in-content header: ✕ close + title. Transparent background
 * lets the liquid glass show through.
 */
export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const signedIn = useAuthStore((s) => s.status === "signedIn");
  const signOut = useAuthStore((s) => s.signOut);

  const [url, setUrl] = useState("");
  const [clineProvider, setClineProvider] = useState("deepseek");
  const [clineModel, setClineModel] = useState("");
  const [clineKeys, setClineKeys] = useState<Record<string, string>>({});
  const [clineKey, setClineKey] = useState("");
  const [codexKey, setCodexKey] = useState("");
  const [codexMasked, setCodexMasked] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [claudeMasked, setClaudeMasked] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getApiUrl().then(setUrl);
    if (!signedIn) return;
    getProviderSettings()
      .then((p) => {
        setClineProvider(p.cline.provider);
        setClineModel(p.cline.model);
        setClineKeys(p.cline.keys);
        setCodexMasked(p.codex.key);
        setClaudeMasked(p.claude.key);
      })
      .catch((e) => {
        setStatus(
          `Couldn't load provider settings: ${e instanceof Error ? e.message : String(e)}`
        );
      });
  }, [signedIn]);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await setApiUrl(url);
      if (signedIn) {
        await saveProviderSettings({
          cline: {
            provider: clineProvider,
            model: clineModel.trim() || undefined,
            apiKey: clineKey.trim() || undefined,
          },
          codex: { apiKey: codexKey.trim() || undefined },
          claude: { apiKey: claudeKey.trim() || undefined },
        });
        setClineKey("");
        setCodexKey("");
        setClaudeKey("");
        const p = await getProviderSettings();
        setClineKeys(p.cline.keys);
        setCodexMasked(p.codex.key);
        setClaudeMasked(p.claude.key);
      }
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

  return (
    <View style={styles.container}>
      {/* In-content header (iOS-only app — no native header in the sheet). */}
      <SheetHeader
        title="Settings"
        subtitle="Server · AI providers · account"
        onClose={() => router.back()}
        style={styles.sheetHeader}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server</Text>
          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.10:3000"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {signedIn && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Providers</Text>
          <Text style={styles.hint}>
            Keys are stored per-account on the server and injected into your agent's runs.
            Leave a key blank to keep the saved one. No key = the server's .env fallback.
          </Text>

          <Text style={styles.label}>Cline · provider</Text>
          <View style={styles.segmented}>
            {CLINE_PROVIDERS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setClineProvider(p.id)}
                style={[styles.segment, clineProvider === p.id && styles.segmentActive]}
              >
                <Text
                  style={[styles.segmentText, clineProvider === p.id && styles.segmentTextActive]}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.masked}>
            {clineKeys[clineProvider] ? `Saved key: ${clineKeys[clineProvider]}` : "No key saved"}
          </Text>

          <Text style={styles.label}>Cline · model</Text>
          <TextInput
            style={styles.input}
            value={clineModel}
            onChangeText={setClineModel}
            placeholder="deepseek-v4-flash"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Cline · API key</Text>
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

          <Text style={styles.label}>Codex · API key</Text>
          <TextInput
            style={styles.input}
            value={codexKey}
            onChangeText={setCodexKey}
            placeholder={codexMasked || "sk-…"}
            placeholderTextColor={codexMasked ? "#6B7280" : "#9CA3AF"}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Claude · API key</Text>
          <TextInput
            style={styles.input}
            value={claudeKey}
            onChangeText={setClaudeKey}
            placeholder={claudeMasked || "sk-ant-…"}
            placeholderTextColor={claudeMasked ? "#6B7280" : "#9CA3AF"}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        )}

        {!signedIn && (
          <Text style={styles.hint}>Sign in to manage per-account AI provider keys.</Text>
        )}

        {status && <Text style={styles.status}>{status}</Text>}

        <Pressable onPress={save} style={[styles.primary, busy && styles.primaryBusy]}>
          <Text style={styles.primaryText}>{busy ? "Saving…" : "Save"}</Text>
        </Pressable>
        <Pressable onPress={test} style={styles.ghost}>
          <Text style={styles.ghostText}>Test connection</Text>
        </Pressable>

        {signedIn && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Text style={styles.hint}>
              {user?.email ?? "Signed in"} · session stored in the iOS keychain
            </Text>
            <Pressable onPress={() => signOut().catch(() => {})} style={styles.danger}>
              <Text style={styles.dangerText}>Sign out</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent so the iOS 26 liquid glass shows through the sheet.
    backgroundColor: "transparent",
    padding: 16,
  },
  sheetHeader: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 8 },
  scrollContent: { paddingBottom: 24, gap: 12 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#111" },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6 },
  hint: { fontSize: 12, color: "#6B7280", lineHeight: 17 },
  masked: { fontSize: 12, color: "#059669", fontWeight: "600" },
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
  status: { color: "#666", fontSize: 13 },
  primary: { backgroundColor: "#111", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  primaryBusy: { opacity: 0.6 },
  primaryText: { color: "#fff", fontWeight: "700" },
  ghost: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff", alignItems: "center" },
  ghostText: { color: "#111", fontWeight: "600" },
  danger: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", alignItems: "center" },
  dangerText: { color: "#DC2626", fontWeight: "700" },
});
