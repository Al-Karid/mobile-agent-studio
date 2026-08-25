import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";
import { LinkText } from "@/components/link-text";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Event type/message → the same `[icon] message` display used by bubbles. */
function eventIcon(type: string, message: string): { name: IconName; color: string } {
  if (type === "error") return { name: "alert-circle", color: "#ff4136" };
  if (type === "ready") {
    if (message.startsWith("exp://")) return { name: "link-outline", color: "#4aa3ff" };
    return { name: "checkmark-circle", color: "#2ecc40" };
  }
  if (type === "question") return { name: "help-circle-outline", color: "#8b5cf6" };
  if (type === "agent_response") return { name: "sparkles-outline", color: "#8b5cf6" };
  if (type === "log") return { name: "terminal-outline", color: "#8a8f98" };
  if (type === "status") {
    if (message === "ready") return { name: "checkmark-circle", color: "#2ecc40" };
    if (message === "App stopped") return { name: "stop-circle-outline", color: "#8a8f98" };
    if (message === "launching" || message === "launched")
      return { name: "rocket-outline", color: "#4aa3ff" };
    if (message === "failed" || message === "interrupted" || message === "needs_dev_build")
      return { name: "alert-circle", color: "#ff4136" };
    if (message === "awaiting_input") return { name: "time-outline", color: "#8b5cf6" };
    if (message === "initializing") return { name: "construct-outline", color: "#8a8f98" };
    if (message === "generating") return { name: "code-slash-outline", color: "#8b5cf6" };
    if (message === "qa") return { name: "shield-checkmark-outline", color: "#f5a623" };
    return { name: "terminal-outline", color: "#666" };
  }
  return { name: "information-circle-outline", color: "#999" };
}

/**
 * One real project event — rendered with the project page's own display
 * system: `[icon] message` (no type label), same visual language as bubbles.
 */
export function EventRow({
  type,
  message,
  ongoing = false,
  error = false,
}: {
  type: string;
  message: string;
  ongoing?: boolean;
  error?: boolean;
}) {
  const ic = eventIcon(type, message);
  return (
    <View style={styles.row}>
      {ongoing ? (
        <ActivityIndicator size={14} color={ic.color} />
      ) : (
        <Ionicons
          name={error ? "alert-circle" : ic.name}
          size={13}
          color={error ? "#c00" : ic.color}
        />
      )}
      {message.startsWith("exp://") ? (
        <LinkText url={message} style={styles.msg}>
          {message}
        </LinkText>
      ) : (
        <Text style={[styles.msg, error && styles.msgError]} numberOfLines={3}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 3 },
  msg: { color: "#333", fontSize: 13, flex: 1, lineHeight: 18 },
  msgError: { color: "#c00" },
});
