import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/lib/auth-store";

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const boot = useAuthStore((s) => s.boot);

  useEffect(() => {
    boot();
  }, [boot]);

  // While we validate any stored token, show a bare splash instead of
  // flashing the login screen.
  if (status === "loading") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F5F5F7",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  const signedIn = status === "signedIn";

  return (
    // preload={false}: the library preloads the keyboard on app start, which
    // can cause a brief keyboard flicker — we don't autofocus, so disable it.
    <KeyboardProvider preload={false}>
      <Stack>
        {/* Everything except the login screen is behind the auth gate. */}
        <Stack.Protected guard={signedIn}>
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
              sheetAllowedDetents: [0.68],
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
              sheetAllowedDetents: [0.9],
              sheetInitialDetentIndex: 0,
              contentStyle: { backgroundColor: "transparent" },
              sheetLargestUndimmedDetentIndex: -1,
            }}
          />
        </Stack.Protected>
        {/* login is the ONLY screen outside the guard. It must be the first
            declared non-protected screen: when signed out, expo-router filters
            out the Protected group and the FIRST remaining screen becomes the
            initial route. A formSheet modal as the first remaining screen would
            boot as a root modal with nothing beneath it — undismissable. */}
        <Stack.Screen
          name="login"
          options={{ headerShown: false, gestureEnabled: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </KeyboardProvider>
  );
}
