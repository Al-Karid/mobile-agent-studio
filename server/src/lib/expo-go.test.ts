import { test } from "node:test";
import assert from "node:assert/strict";
import { filterAllowed, validateDeps } from "./expo-go";

test("validateDeps: Expo Go-safe deps pass", () => {
  const r = validateDeps({
    dependencies: {
      expo: "~57.0.0",
      "expo-router": "~57.0.0",
      react: "19.1.0",
      "react-native": "0.81.5",
      "react-native-reanimated": "4.5.1",
    },
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
});

test("validateDeps: native modules outside the allow-list are flagged", () => {
  const r = validateDeps({
    dependencies: {
      expo: "~57.0.0",
      "react-native-vision-camera": "4.0.0",
      "@gorhom/bottom-sheet": "5.0.0",
    },
  });
  assert.equal(r.ok, false);
  assert.deepEqual([...r.violations].sort(), ["@gorhom/bottom-sheet", "react-native-vision-camera"]);
});

test("validateDeps: @expo/ui is flagged (dropped from the project's UI stack)", () => {
  const r = validateDeps({
    dependencies: {
      "@expo/ui": "~57.0.0",
    },
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.violations, ["@expo/ui"]);
});

test("validateDeps: @react-navigation and expo-* are allowed", () => {
  const r = validateDeps({
    dependencies: {
      "@react-navigation/native": "^7.0.0",
      "expo-camera": "~57.0.0",
      "expo-sqlite": "~57.0.0",
    },
  });
  assert.equal(r.ok, true);
});

test("validateDeps: official Expo Go third-party natives are allowed", () => {
  const r = validateDeps({
    dependencies: {
      "react-native-maps": "1.18.0",
      "react-native-webview": "13.13.0",
      "@shopify/react-native-skia": "~2.0.0",
      "react-native-keyboard-controller": "1.21.9",
      "@react-native-async-storage/async-storage": "~2.1.0",
      "@react-native-community/netinfo": "~11.4.0",
    },
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
});

test("validateDeps: packages that require a dev build are flagged", () => {
  const r = validateDeps({
    dependencies: {
      "@gorhom/bottom-sheet": "5.0.0",
      "react-native-vision-camera": "4.0.0",
      "@react-native-clipboard/clipboard": "1.16.2",
    },
  });
  assert.equal(r.ok, false);
  assert.deepEqual([...r.violations].sort(), [
    "@gorhom/bottom-sheet",
    "@react-native-clipboard/clipboard",
    "react-native-vision-camera",
  ]);
});

test("validateDeps: the expo-router template native stack is allowed", () => {
  const r = validateDeps({
    dependencies: {
      expo: "~57.0.16",
      "expo-router": "~57.0.16",
      react: "19.2.3",
      "react-native": "0.86.2",
      "react-native-gesture-handler": "~2.32.0",
      "react-native-reanimated": "4.5.1",
      "react-native-safe-area-context": "~5.7.0",
      "react-native-screens": "~4.26.0",
      "react-native-worklets": "0.10.1",
    },
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.violations, []);
});

test("filterAllowed: prunes non-allow-listed deps (e.g. @expo/ui from the template)", () => {
  const kept = filterAllowed({
    expo: "~57.0.16",
    "@expo/ui": "~57.0.13",
    "expo-glass-effect": "~57.0.1",
    "react-native-screens": "~4.26.0",
    "@gorhom/bottom-sheet": "5.0.0",
  });
  assert.deepEqual(kept, {
    expo: "~57.0.16",
    "expo-glass-effect": "~57.0.1",
    "react-native-screens": "~4.26.0",
  });
});
