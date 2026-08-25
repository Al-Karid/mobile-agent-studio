import { useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { HeaderButton } from "expo-router/build/react-navigation/elements/Header/HeaderButton";
import { useChat } from "@/hooks/use-chat";
import { useProjectActions } from "@/hooks/use-project-actions";
import { statusColor } from "@/lib/status";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInputBar } from "@/components/chat/input-bar";
import { OpenAppButton } from "@/components/open-app-button";

/**
 * Minimalist ChatGPT-style project page: user/agent turns, an input bar,
 * and one "Open" action. Settings live in the native header and the settings
 * page; everything else moved there.
 */
export default function ProjectChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project, error, setProject, setError, turns, input, setInput, send, busy, sendError } =
    useChat(id);
  const actions = useProjectActions({
    projectId: id,
    status: project?.status,
    expUrl: project?.exp_url,
    onProjectChange: setProject,
    onError: setError,
  });
  const scrollRef = useRef<ScrollView>(null);

  const openVisible =
    !!project && (project.status === "ready" || project.status === "launched");

  return (
    <View style={styles.container}>
      {/* background gradient: full screen, perfectly gradual #ffffff → #f5f5f5 */}
      <LinearGradient
        colors={[
          "#ffffff",
          "#fefefe",
          "#fdfdfd",
          "#fcfcfc",
          "#fbfbfb",
          "#fafafa",
          "#f9f9f9",
          "#f8f8f8",
          "#f7f7f7",
          "#f6f6f6",
          "#f5f5f5",
          "#f4f4f4",
          "#f3f3f3",
        ]}
        style={styles.gradient}
        pointerEvents="none"
      />

      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton
              onPress={() => router.push(`/project/${id}/settings`)}
              accessibilityLabel="Project settings"
              testID="project-settings-button"
            >
              <Ionicons name="settings-outline" size={22} color="#111" />
            </HeaderButton>
          ),
        }}
      />

      {/* slim bar: project name + status dot + Open action */}
      <View style={styles.bar}>
        <View style={styles.titleWrap}>
          {project && (
            <View style={[styles.dot, { backgroundColor: statusColor(project.status) }]} />
          )}
          <Text style={styles.name} numberOfLines={1}>
            {project?.name ?? "…"}
          </Text>
        </View>
        <OpenAppButton onPress={actions.open} busy={actions.opening} visible={openVisible} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* conversation */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {turns.length === 0 && (
          <Text style={styles.empty}>Ask me to build or change this app…</Text>
        )}
        {turns.map((t) => (
          <MessageBubble key={t.id} turn={t} onAnswer={send} />
        ))}
      </ScrollView>

      {/* input — self-contained keyboard behavior; screen scrolls on open */}
      <ChatInputBar
        value={input}
        onChangeText={setInput}
        onSend={send}
        busy={busy}
        onKeyboardShow={() => scrollRef.current?.scrollToEnd({ animated: true })}
      />
      {sendError && <Text style={styles.error}>{sendError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  // Full-screen gradient: #ffffff at the top → #f5f5f5 at the bottom
  // (bottom appears darker than the top two-thirds).
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  name: { fontSize: 17, fontWeight: "700", color: "#111", flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  messages: { flex: 1 },
  messagesContent: { padding: 16 },
  empty: { textAlign: "center", color: "#999", marginTop: 60, fontSize: 14 },
  error: { color: "#c00", fontSize: 12, paddingHorizontal: 16, paddingTop: 6 },
});


