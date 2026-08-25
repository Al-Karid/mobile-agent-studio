import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { HeaderButton } from "expo-router/build/react-navigation/elements/Header/HeaderButton";
import { useHeaderHeight } from "expo-router/build/react-navigation/elements";
import { useProjectStore } from "@/lib/project-store";
import { ProjectCard } from "@/components/project-card";

export default function ProjectsScreen() {
  const [error, setError] = useState<string | null>(null);
  const projects = useProjectStore((s) => s.projects);
  const refreshProjects = useProjectStore((s) => s.refreshProjects);

  // iOS header is transparent → the list content must start below it.
  // (Padding lives on the scroll CONTENT, not the container, so the background
  // fills the screen behind the header and cards scroll under it.)
  const headerHeight = useHeaderHeight();
  const headerTopInset = Platform.OS === "ios" ? headerHeight : 0;

  const load = useCallback(() => {
    refreshProjects().catch((e) =>
      setError(e instanceof Error ? e.message : String(e))
    );
  }, [refreshProjects]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 4000);
      return () => clearInterval(t);
    }, [load])
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <>
              <HeaderButton
                onPress={() => router.push("/new")}
                accessibilityLabel="New Project"
                testID="new-project-button"
              >
                <Ionicons name="add" size={26} color="#111" />
              </HeaderButton>
              <HeaderButton
                onPress={() => router.push("/settings")}
                accessibilityLabel="Settings"
                testID="settings-button"
              >
                <Ionicons name="settings-outline" size={22} color="#111" />
              </HeaderButton>
            </>
          ),
        }}
      />

      {/* Greeting card — first item in the list, scrolls with the projects. */}
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerTopInset + 16 },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.greeting}>
              <Text style={styles.greetingTitle}>Hello there</Text>
              <Text style={styles.greetingSubtitle}>
                So what do we build today?
              </Text>
            </View>
            {error ? (
              <Text style={styles.error}>Can&apos;t reach server: {error}</Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No projects yet. Tap “New” to build your first app.</Text>
        }
        renderItem={({ item }) => <ProjectCard item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Background fills the whole screen (including behind the transparent
  // header); only the scroll content is offset below it.
  container: { flex: 1, backgroundColor: "#F5F5F7", paddingHorizontal: 16 },
  greeting: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 4,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: "#111",
  },
  greetingSubtitle: { fontSize: 15, color: "#6B7280" },
  listContent: { gap: 8, paddingBottom: 24 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  error: { color: "#c00", marginBottom: 10, fontSize: 13 },
});
