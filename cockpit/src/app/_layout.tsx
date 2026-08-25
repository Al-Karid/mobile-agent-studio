import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Projects" }} />
        <Stack.Screen name="new" options={{ title: "New Project", presentation: "modal" }} />
        <Stack.Screen name="project/[id]" options={{ title: "Project" }} />
        <Stack.Screen name="project/[id]/settings" options={{ title: "Settings" }} />
        <Stack.Screen name="settings" options={{ title: "Settings", presentation: "modal" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
