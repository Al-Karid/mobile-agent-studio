import { useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { HeaderButton } from "expo-router/build/react-navigation/elements/Header/HeaderButton";
import { useHeaderHeight } from "expo-router/build/react-navigation/elements";
import { useChat } from "@/hooks/use-chat";
import { useProjectActions } from "@/hooks/use-project-actions";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInputBar } from "@/components/chat/input-bar";
import { EventRow } from "@/components/event-row";
import { LaunchStack } from "@/components/launch-stack";

/**
 * Minimalist ChatGPT-style project page: user/agent turns, an input bar,
 * and one "Open" action. Settings live in the native header and the settings
 * page; everything else moved there.
 */
export default function ProjectChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    project,
    error,
    setProject,
    setError,
    timeline,
    input,
    setInput,
    send,
    busy,
    sendError,
    inputLocked,
  } = useChat(id);
  const actions = useProjectActions({
    projectId: id,
    expUrl: project?.exp_url,
    onProjectChange: setProject,
    onError: setError,
  });
  const scrollRef = useRef<ScrollView>(null);
  const headerHeight = useHeaderHeight();

  // iOS header is transparent → content must start below it there.
  const headerTopInset = Platform.OS === "ios" ? headerHeight : 0;

  const running = project?.status === "launched";

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
          title: project?.name ?? "Project",
          headerRight: () => (
            <>
              {running ? (
                <>
                  <HeaderButton
                    onPress={actions.open}
                    accessibilityLabel="Open app"
                    testID="open-app-button"
                  >
                    <Ionicons name="open-outline" size={22} color="#111" />
                  </HeaderButton>
                  <HeaderButton
                    onPress={actions.stop}
                    accessibilityLabel="Stop app"
                    testID="stop-app-button"
                  >
                    {actions.stopping ? (
                      <ActivityIndicator size="small" color="#ff3b30" />
                    ) : (
                      <Ionicons name="stop" size={22} color="#ff3b30" />
                    )}
                  </HeaderButton>
                </>
              ) : (
                <HeaderButton
                  onPress={actions.start}
                  accessibilityLabel="Start app"
                  testID="start-app-button"
                >
                  {actions.starting ? (
                    <ActivityIndicator size="small" color="#111" />
                  ) : (
                    <Ionicons name="play-outline" size={22} color="#111" />
                  )}
                </HeaderButton>
              )}

              <HeaderButton
                onPress={() => router.push(`/project/${id}/settings`)}
                accessibilityLabel="Project settings"
                testID="project-settings-button"
              >
                <Ionicons name="settings-outline" size={22} color="#111" />
              </HeaderButton>
            </>
          ),
        }}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      {/* conversation */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingTop: headerTopInset + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {timeline.length === 0 && (
          <Text style={styles.empty}>Ask me to build or change this app…</Text>
        )}
        {timeline.map((item) =>
          item.kind === "user" ? (
            <MessageBubble
              key={item.id}
              turn={{
                id: item.id,
                role: "user",
                text: item.text,
                status: "done",
                runId: item.runId,
              }}
            />
          ) : item.kind === "launch" ? (
            <LaunchStack key={item.id} events={item.events} />
          ) : item.kind === "question" ? (
            // Agent asked the user a question — render the option chips so the
            // user can answer with one tap (sends the chosen option as a prompt).
            // Chips go inert once answered (or while another run is busy) so a
            // mis-tap can't regenerate the answer.
            <MessageBubble
              key={item.id}
              onAnswer={(opt) => send(opt)}
              turn={{
                id: item.id,
                role: "agent",
                status: "question",
                question: {
                  question: item.question,
                  options: item.options,
                  answered: item.answered || busy,
                },
                runId: item.runId ?? 0,
              }}
            />
          ) : item.kind === "event" && item.type === "agent_response" ? (
            // The agent's actual response goes in a ghost-like bubble.
            <MessageBubble
              key={item.id}
              turn={{
                id: item.id,
                role: "agent",
                text: item.message,
                status: "done",
                runId: item.runId ?? 0,
              }}
            />
          ) : (
            <EventRow
              key={item.id}
              type={item.type}
              message={item.message}
              ongoing={item.ongoing}
            />
          ),
        )}
      </ScrollView>

      {/* input — self-contained keyboard behavior; screen scrolls on open */}
      <ChatInputBar
        value={input}
        onChangeText={setInput}
        onSend={send}
        busy={busy}
        enabled={!inputLocked}
        onKeyboardShow={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
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
  messages: { flex: 1 },
  messagesContent: { padding: 16 },
  empty: { textAlign: "center", color: "#999", marginTop: 60, fontSize: 14 },
  error: { color: "#c00", fontSize: 12, paddingHorizontal: 16, paddingTop: 6 },
});
