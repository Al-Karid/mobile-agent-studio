import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRef, useState } from "react";
import type { ComponentProps } from "react";
import * as Clipboard from "expo-clipboard";
import Markdown from "react-native-markdown-display";
import type { ChatTurn } from "@/lib/chat";

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Agent responses render as markdown, styled to match the bubble. */
const markdownStyles = {
  body: { color: "#111", fontSize: 15, lineHeight: 21 },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: "700" },
  em: { fontStyle: "italic" },
  code_inline: {
    fontFamily: MONO,
    fontSize: 13,
    color: "#d6336c",
    backgroundColor: "#e9ecef",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  code_block: {
    fontFamily: MONO,
    fontSize: 13,
    color: "#111",
    backgroundColor: "#e9ecef",
    borderRadius: 6,
    padding: 8,
    marginVertical: 4,
  },
  link: { color: "#1a6fc4", textDecorationLine: "underline" },
  bullet_list: { marginVertical: 2 },
  ordered_list: { marginVertical: 2 },
  list_item: { marginVertical: 1 },
} as const;

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
  // Long-press an agent turn (response or question) to copy its text.
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function copyText(text: string) {
    if (!text) return;
    Clipboard.setStringAsync(text)
      .then(() => {
        setCopied(true);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        /* clipboard unavailable — ignore */
      });
  }

  // Question copy content: question line + options (one per line).
  const questionText = turn.question
    ? [turn.question.question ?? "Question", ...(turn.question.options ?? [])].join(
        "\n"
      )
    : null;
  // Once the user answered (or a newer run is busy), chips become inert.
  const answered = !!turn.question?.answered;

  if (turn.role === "user") {
    return (
      <View style={styles.userRow}>
        <Pressable
          onLongPress={() => turn.text && copyText(turn.text)}
          style={({ pressed }) => [
            styles.userBubble,
            pressed && styles.userBubblePressed,
          ]}
        >
          <Text style={styles.userText}>{turn.text}</Text>
        </Pressable>
        {copied && (
          <View style={styles.copiedPill} pointerEvents="none">
            <Ionicons name="checkmark-circle" size={12} color="#2ecc40" />
            <Text style={styles.copiedPillText}>Copied</Text>
          </View>
        )}
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
          <Pressable onLongPress={() => questionText && copyText(questionText)}>
            <View style={styles.stepRow}>
              <Ionicons
                name={answered ? "checkmark-circle" : "help-circle-outline"}
                size={15}
                color={answered ? "#2ecc40" : "#8b5cf6"}
              />
              <Text style={[styles.question, answered && styles.questionMuted]}>
                {turn.question.question ?? "Question"}
              </Text>
              {answered && <Text style={styles.answeredNote}>answered</Text>}
            </View>
          </Pressable>
          {(turn.question.options ?? []).map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onAnswer?.(opt)}
              disabled={answered}
              style={[styles.option, answered && styles.optionDisabled]}
            >
              <Text style={[styles.optionText, answered && styles.optionTextDisabled]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* only the agent's response goes in a bubble — markdown + long-press copy */}
      {turn.text ? (
        <Pressable
          onLongPress={() => turn.text && copyText(turn.text)}
          style={({ pressed }) => [
            styles.agentBubble,
            pressed && styles.agentBubblePressed,
          ]}
        >
          <Markdown style={markdownStyles}>{turn.text}</Markdown>
        </Pressable>
      ) : null}
      {turn.error ? (
        <View style={styles.stepRow}>
          <Ionicons name="alert-circle" size={13} color="#c00" />
          <Text style={[styles.step, styles.errorText]}>{turn.error}</Text>
        </View>
      ) : null}
      {copied && (
        <View style={styles.copiedPill} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={12} color="#2ecc40" />
          <Text style={styles.copiedPillText}>Copied</Text>
        </View>
      )}
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
  userBubblePressed: { backgroundColor: "#2a2a2a" },
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
  questionMuted: { color: "#8a8f98", fontWeight: "500" },
  answeredNote: { fontSize: 11, fontWeight: "600", color: "#2ecc40" },
  option: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#4aa3ff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  optionDisabled: {
    borderColor: "#e2e6ea",
    backgroundColor: "#f8f9fa",
  },
  optionText: { color: "#1a6fc4", fontWeight: "600", fontSize: 14 },
  optionTextDisabled: { color: "#9aa3ad", fontWeight: "500" },
  agentBubble: {
    alignSelf: "flex-start",
    maxWidth: "92%",
    backgroundColor: "#f1f3f5",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  agentBubblePressed: { backgroundColor: "#e2e6ea" },
  copiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  copiedPillText: { fontSize: 12, fontWeight: "600", color: "#2ecc40" },
});

