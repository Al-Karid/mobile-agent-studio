import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDeps } from "./expo-go";

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
