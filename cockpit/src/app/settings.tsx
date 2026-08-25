import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { getApiUrl, setApiUrl } from "@/lib/settings";
import { health } from "@/lib/api";
import { SheetHeader } from "@/components/sheet-header";

/**
 * Settings — presented as a native iOS liquid-glass sheet (formSheet).
 * No native header on iOS (same formSheet bugs as New Project), so the screen
 * renders its own in-content header: ✕ close + title. Transparent background
 * lets the liquid glass show through.
 */
export default function SettingsScreen() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    getApiUrl().then(setUrl);
  }, []);

  async function save() {
    await setApiUrl(url);
    setStatus("Saved");
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
        subtitle="Server connection"
        onClose={() => router.back()}
        style={styles.sheetHeader}
      />

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

      {status && <Text style={styles.status}>{status}</Text>}

      <Pressable onPress={save} style={styles.primary}>
        <Text style={styles.primaryText}>Save</Text>
      </Pressable>
      <Pressable onPress={test} style={styles.ghost}>
        <Text style={styles.ghostText}>Test connection</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent so the iOS 26 liquid glass shows through the sheet.
    backgroundColor: "transparent",
    padding: 16,
    gap: 12,
  },
  sheetHeader: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 8 },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6 },
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
  status: { color: "#666", fontSize: 13 },
  primary: { backgroundColor: "#111", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700" },
  ghost: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff", alignItems: "center" },
  ghostText: { color: "#111", fontWeight: "600" },
});
