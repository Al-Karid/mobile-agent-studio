import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { getApiUrl, setApiUrl } from "@/lib/settings";
import { health } from "@/lib/api";

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
      <Text style={styles.label}>Server URL</Text>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={setUrl}
        placeholder="http://192.168.1.10:3000"
        placeholderTextColor="#999"
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
  container: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, fontSize: 15, color: "#111" },
  status: { color: "#666", fontSize: 13 },
  primary: { backgroundColor: "#111", paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700" },
  ghost: { paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  ghostText: { color: "#111", fontWeight: "600" },
});
