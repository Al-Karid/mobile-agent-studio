import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";
import type { ChatTurn } from "@/lib/chat";

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Terminal-style status icon per step (code-relevant, state-aware). */
function stepIcon(step: string): { name: IconName; color: string } {
  if (step === "done") return { name: "checkmark-circle", color: "#2ecc40" };
  if (step === "failed" || step === "interrupted" || step.startsWith("needs"))
    return { name: "alert-circle", color: "#ff4136" };
  if (step.startsWith("waiting")) return { name: "time-outline", color: "#8b5cf6" };
  return { name: "terminal-outline", color: "#666" };
}

/**
 * One chat turn. Server state events (steps, errors) render as plain
 * terminal-style lines with an icon — ONLY the agent's actual response goes
 * in a bubble.
 */
export function MessageBubble({
  turn,
  onAnswer,
}: {
  turn: ChatTurn;
  onAnswer?: (text: string) => void;
}) {
  if (turn.role === "user") {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{turn.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.agentRow}>
      {/* server state events — no bubble, icon + code-style text */}
      {turn.steps && turn.steps.length > 0 && (
        <View style={styles.steps}>
          {turn.steps.map((s, i) => {
            const ic = stepIcon(s);
            return (
              <View key={`${i}-${s}`} style={styles.stepRow}>
                <Ionicons name={ic.name} size={13} color={ic.color} />
                <Text style={styles.step}>{s}</Text>
              </View>
            );
          })}
        </View>
      )}
      {turn.status === "pending" && !turn.question && (
        <View style={styles.stepRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color="#888" />
          <Text style={styles.step}>Working on it…</Text>
        </View>
      )}

      {/* agent→user question — icon + plain text + option chips, no bubble */}
      {turn.question && (
        <View style={styles.questionBox}>
          <View style={styles.stepRow}>
            <Ionicons name="help-circle-outline" size={15} color="#8b5cf6" />
            <Text style={styles.question}>{turn.question.question}</Text>
          </View>
          {turn.question.options.map((opt) => (
            <Pressable key={opt} onPress={() => onAnswer?.(opt)} style={styles.option}>
              <Text style={styles.optionText}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* only the agent's response goes in a bubble */}
      {turn.text ? (
        <View style={styles.agentBubble}>
          <Text style={styles.response}>{turn.text}</Text>
        </View>
      ) : null}
      {turn.error ? (
        <View style={styles.stepRow}>
          <Ionicons name="alert-circle" size={13} color="#c00" />
          <Text style={[styles.step, styles.errorText]}>{turn.error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: { alignItems: "flex-end", marginTop: 4, marginBottom: 16 },
  userBubble: {
    maxWidth: "85%",
    backgroundColor: "#111",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: { color: "#fff", fontSize: 15, lineHeight: 21 },
  agentRow: { alignItems: "flex-start", marginVertical: 4, gap: 4 },
  steps: { gap: 2 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  step: {
    fontFamily: MONO,
    color: "#666",
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: { color: "#c00" },
  questionBox: { gap: 8, marginTop: 2 },
  question: { fontSize: 15, fontWeight: "600", color: "#111", flexShrink: 1 },
  option: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#4aa3ff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  optionText: { color: "#1a6fc4", fontWeight: "600", fontSize: 14 },
  agentBubble: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    backgroundColor: "#f1f3f5",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  response: { color: "#111", fontSize: 15, lineHeight: 21 },
});

