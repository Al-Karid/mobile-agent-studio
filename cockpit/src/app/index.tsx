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

  // iOS header is transparent → content must start below it there.
  const headerTopInset = Platform.OS === "ios" ? useHeaderHeight() + 16 : 0;

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
    <View style={[styles.container, { paddingTop: headerTopInset }]}>
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

      {error && <Text style={styles.error}>Can't reach server: {error}</Text>}

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No projects yet. Tap “New” to build your first app.</Text>
        }
        renderItem={({ item }) => <ProjectCard item={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F7", padding: 16 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  error: { color: "#c00", marginBottom: 10, fontSize: 13 },
});
