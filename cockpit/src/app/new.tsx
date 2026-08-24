import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { createProject } from "@/lib/api";

export default function NewProjectScreen() {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("dry-run");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !prompt.trim()) {
      setError("Name and prompt are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProject({ name: name.trim(), prompt: prompt.trim(), agent });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Project name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="My tasks app" placeholderTextColor="#999" />

      <Text style={styles.label}>Describe the app you want</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={prompt}
        onChangeText={setPrompt}
        placeholder="A to-do app with categories, a dark theme, and local storage…"
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.label}>Agent</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {["dry-run", "cline"].map((a) => (
          <Pressable
            key={a}
            onPress={() => setAgent(a)}
            style={[styles.chip, agent === a && styles.chipActive]}
          >
            <Text style={agent === a ? styles.chipTextActive : styles.chipText}>{a}</Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={submit} disabled={busy} style={[styles.submit, busy && { opacity: 0.5 }]}>
        <Text style={styles.submitText}>{busy ? "Creating…" : "Create"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#333", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#111",
  },
  textarea: { minHeight: 110 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { color: "#111" },
  chipTextActive: { color: "#fff" },
  error: { color: "#c00", marginTop: 8 },
  submit: { backgroundColor: "#111", paddingVertical: 15, borderRadius: 10, alignItems: "center", marginTop: 16 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
