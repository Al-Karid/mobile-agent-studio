import { Platform } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    // preload={false}: the library preloads the keyboard on app start, which
    // can cause a brief keyboard flicker — we don't autofocus, so disable it.
    <KeyboardProvider preload={false}>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Projects",
            // iOS only: let the page background extend behind the header.
            headerTransparent: Platform.select({ ios: true, default: false }),
          }}
        />
        <Stack.Screen
          name="new"
          options={{
            title: "New Project",
            // iOS-only app: no native header in the sheet — the screen renders
            // its own in-content header (✕ + title + Create). A native header
            // inside a formSheet is buggy in react-native-screens (#3092, #4275)
            // and can hide the content.
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: false,
            sheetGrabberVisible: false,
            sheetAllowedDetents: [0.52],
            sheetInitialDetentIndex: 0,
            // transparent content lets the iOS 26 liquid glass show through
            contentStyle: { backgroundColor: "transparent" },
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />
        <Stack.Screen
          name="project/[id]"
          options={{
            title: "Project",
            // iOS only: let the page background extend behind the header.
            headerTransparent: Platform.select({ ios: true, default: false }),
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <Stack.Screen
          name="project/[id]/settings"
          options={{
            title: "Settings",
            headerTransparent: Platform.select({ ios: true, default: false }),
            headerBackButtonDisplayMode: "minimal",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: "Settings",
            // Same formSheet treatment as "new": no native header — the screen
            // renders its own in-content header.
            headerShown: false,
            presentation: "formSheet",
            gestureEnabled: true,
            sheetGrabberVisible: false,
            sheetAllowedDetents: [0.55],
            sheetInitialDetentIndex: 0,
            contentStyle: { backgroundColor: "transparent" },
            sheetLargestUndimmedDetentIndex: -1,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </KeyboardProvider>
  );
}
