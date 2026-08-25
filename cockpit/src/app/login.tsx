import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/lib/auth-store";

// Default dev account (seeded by the server on boot).
const DEFAULT_EMAIL = "al.cisse@revalys.com";
const DEFAULT_PASSWORD = "password1234";

/**
 * Sign-in / create-account. Email + password first; Google & GitHub are
 * reserved as disabled placeholders (OAuth needs a development build).
 * The server URL is configured in Settings, which is behind the auth gate —
 * before the first login the app uses the default API URL.
 */
export default function LoginScreen() {
  const { signIn, signUp } = useAuthStore();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    if (!email.trim() || password.length < 8) {
      setError("Enter a valid email and a password (min 8 chars).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
      // The root layout's Stack.Protected guard swaps to the app automatically.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="construct" size={26} color="#fff" />
            </View>
            <Text style={styles.title}>Mobile Agent Studio</Text>
            <Text style={styles.subtitle}>
              Describe an app — an AI agent builds it, then launches it in Expo Go.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                onSubmitEditing={submit}
                returnKeyType="done"
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              onPress={submit}
              disabled={busy}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                busy && styles.submitButtonBusy,
              ]}
            >
              <Text style={styles.submitText}>
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <View style={styles.socialDisabled}>
                <Ionicons name="logo-google" size={18} color="#9CA3AF" />
                <Text style={styles.socialText}>Google</Text>
              </View>
              <View style={styles.socialDisabled}>
                <Ionicons name="logo-github" size={18} color="#9CA3AF" />
                <Text style={styles.socialText}>GitHub</Text>
              </View>
            </View>
            <Text style={styles.socialNote}>
              Social sign-in needs a development build — coming soon.
            </Text>
          </View>

          <Pressable
            onPress={() => {
              setMode(mode === "signin" ? "register" : "signin");
              setError(null);
            }}
            hitSlop={12}
          >
            <Text style={styles.toggle}>
              {mode === "signin" ? (
                <>
                  New here? <Text style={styles.toggleLink}>Create an account</Text>
                </>
              ) : (
                <>
                  Have an account? <Text style={styles.toggleLink}>Sign in</Text>
                </>
              )}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7" },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 24,
  },
  brand: { alignItems: "center", gap: 8 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#111", textAlign: "center" },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    gap: 16,
  },
  field: { gap: 8 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
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
  submitButton: {
    backgroundColor: "#111",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  submitButtonPressed: { opacity: 0.85 },
  submitButtonBusy: { opacity: 0.6 },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { fontSize: 12, color: "#9CA3AF" },
  socialRow: { flexDirection: "row", gap: 10 },
  socialDisabled: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
  },
  socialText: { fontSize: 14, fontWeight: "600", color: "#9CA3AF" },
  socialNote: { fontSize: 11, color: "#9CA3AF", textAlign: "center" },
  toggle: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  toggleLink: { color: "#111", fontWeight: "700" },
});