/**
 * "Expo Go-safe" dependency validation for GENERATED apps.
 *
 * Expo Go bundles a curated set of native libraries; any other native library
 * requires a development build. This module encodes that allow-list (SDK 57,
 * verified Aug 2026): generated apps may depend ONLY on
 *   - `expo-*` / `@expo/*` modules (except DENIED),
 *   - the official Expo Go third-party list,
 *   - the template core (`react`, `react-native`, `expo`, …),
 *   - `@react-navigation/*` (shipped transitively via expo-router).
 *
 * Anything that requires a development build is a violation (status
 * `needs_dev_build`). `@expo/ui` IS bundled by Expo Go but deliberately
 * DENIED — generated apps must use plain React Native components. The default
 * create-expo-app template ships `@expo/ui`; `initProject` prunes template
 * deps through `filterAllowed` so every generated app starts compliant.
 *
 * Source: https://docs.expo.dev/versions/latest/sdk/third-party-overview.md
 */

// Official Expo Go third-party library list (SDK 57) — these run in Expo Go
// with NO development build.
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

// Packages the project deliberately does NOT support even though Expo Go
// bundles them. @expo/ui was dropped from the UI stack — generated apps must
// use plain React Native components (see jobs/generate.ts AGENT_CONTEXT).
const DENIED = new Set(["@expo/ui"]);

export interface DepValidation {
  ok: boolean;
  violations: string[];
  warnings: string[];
}

function isExpoModule(name: string): boolean {
  return name === "expo" || name.startsWith("expo-") || name.startsWith("@expo/");
}

/** Allow-list check for a single direct dependency. */
export function isAllowed(name: string): boolean {
  if (DENIED.has(name)) return false;
  return (
    CORE.has(name) ||
    isExpoModule(name) ||
    EXPO_GO_THIRD_PARTY.has(name) ||
    // Navigation packages ship transitively via expo-router.
    name.startsWith("@react-navigation/")
  );
}

/** Keep only allow-listed entries (used to prune scaffolding/template deps). */
export function filterAllowed(
  deps: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, version] of Object.entries(deps)) {
    if (isAllowed(name)) out[name] = version;
  }
  return out;
}

/**
 * Validate a generated package.json's direct dependencies against the
 * "Expo Go-safe" allow-list. Returns the packages that are NOT allowed.
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
