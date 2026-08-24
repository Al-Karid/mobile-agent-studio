/**
 * "Expo Go-safe" validation.
 *
 * Expo Go ships a curated set of native libraries. Any other native library
 * requires a development build. This module encodes that allow-list (SDK 57,
 * verified Aug 2026) so the orchestrator can guarantee that a generated app
 * actually runs in Expo Go — the product's core promise.
 *
 * Source: https://docs.expo.dev/versions/latest/sdk/third-party-overview.md
 */

const EXPO_GO_THIRD_PARTY = new Set([
  "@react-native-async-storage/async-storage",
  "@react-native-community/datetimepicker",
  "@react-native-community/netinfo",
  "@react-native-community/slider",
  "@react-native-masked-view/masked-view",
  "@react-native-picker/picker",
  "@react-native-segmented-control/segmented-control",
  "@shopify/flash-list",
  "@shopify/react-native-skia",
  "@stripe/stripe-react-native",
  "react-native-gesture-handler",
  "react-native-keyboard-controller",
  "react-native-maps",
  "react-native-pager-view",
  "react-native-reanimated",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-svg",
  "react-native-view-shot",
  "react-native-webview",
  // reanimated 4 peer dependency — bundled in Expo Go's default template
  // (create-expo-app) but not listed in the official third-party overview.
  "react-native-worklets",
]);

// Core packages every Expo project lists directly and that are always fine.
const CORE = new Set([
  "react",
  "react-dom",
  "react-native",
  "react-native-web",
  "expo",
]);

export interface DepValidation {
  ok: boolean;
  violations: string[];
  warnings: string[];
}

function isExpoModule(name: string): boolean {
  return name === "expo" || name.startsWith("expo-") || name.startsWith("@expo/");
}

function isAllowed(name: string): boolean {
  return (
    CORE.has(name) ||
    isExpoModule(name) ||
    EXPO_GO_THIRD_PARTY.has(name) ||
    // Navigation packages ship transitively via expo-router.
    name.startsWith("@react-navigation/") ||
    // React Native community packages under the @react-native-* scope that are
    // also included transitively by core Expo modules (tolerated, not bundled).
    name.startsWith("@react-native/")
  );
}

/**
 * Validate a generated package.json's direct dependencies against the Expo Go
 * allow-list. Returns the list of packages that would require a development build.
 */
export function validateDeps(pkg: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): DepValidation {
  const deps = Object.keys(pkg.dependencies ?? {});
  const violations: string[] = [];
  const warnings: string[] = [];

  for (const name of deps) {
    if (!isAllowed(name)) violations.push(name);
  }

  // devDependencies (types, eslint, jest…) don't ship in the bundle — no block,
  // but surface native-looking ones as a warning for awareness.
  for (const name of Object.keys(pkg.devDependencies ?? {})) {
    if (!name.startsWith("@types/") && !name.startsWith("eslint") && !name.startsWith("@eslint")) {
      if (/react-native|native|expo/.test(name)) warnings.push(`devDep (not bundled): ${name}`);
    }
  }

  return { ok: violations.length === 0, violations, warnings };
}

export const expoGoAllowList = [...EXPO_GO_THIRD_PARTY];
