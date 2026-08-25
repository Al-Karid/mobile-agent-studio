import { useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
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

  // Pin to the latest message only while the user is ALREADY at the bottom —
  // incoming content keeps the view stuck, but expanding/collapsing a launch
  // card mid-list also changes the content size and must NOT yank the scroll.
  const atBottomRef = useRef(true);
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    atBottomRef.current =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
  };
  const handleContentSizeChange = () => {
    if (atBottomRef.current) scrollRef.current?.scrollToEnd({ animated: true });
  };

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

      {error && (
        <Text style={[styles.error, styles.errorTop, { top: headerTopInset + 12 }]}>
          {error}
        </Text>
      )}

      {/* conversation — fullscreen; content scrolls under the floating input */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingTop: headerTopInset + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}
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
            <LaunchStack key={item.id} events={item.events} running={item.running} />
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

      {/* floating input — overlays the bottom of the fullscreen conversation */}
      <View style={styles.inputFloat} pointerEvents="box-none">
        {sendError && (
          <Text style={[styles.error, styles.sendError]}>{sendError}</Text>
        )}
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
      </View>
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
  // Bottom clearance so the last message isn't hidden behind the floating input.
  messagesContent: { padding: 16, paddingBottom: 140 },
  empty: { textAlign: "center", color: "#999", marginTop: 60, fontSize: 14 },
  error: { color: "#c00", fontSize: 12 },
  errorTop: { position: "absolute", left: 16, right: 16, zIndex: 2 },
  sendError: { paddingHorizontal: 16, paddingBottom: 6, textAlign: "center" },
  inputFloat: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
