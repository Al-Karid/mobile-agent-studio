/**
 * "expo-* only" dependency validation for GENERATED apps.
 *
 * Generated apps may depend ONLY on:
 *   - `expo-*` / `@expo/*` modules (the Expo Go-native surface),
 *   - the template core (`react`, `react-native`, `expo`, `@expo/vector-icons`),
 *   - the expo-router-required native stack (`react-native-screens` & friends),
 *   - `@react-navigation/*` (shipped transitively via expo-router).
 *
 * This is STRICTER than "runs in Expo Go": the official third-party allow-list
 * (react-native-maps, react-native-webview, @shopify/react-native-skia, …) IS
 * bundled in Expo Go, but the product policy is NO external native modules —
 * anything outside the set above is a violation (status `needs_dev_build`).
 *
 * The default create-expo-app template currently ships `@expo/ui`, which is
 * deliberately DENIED here; `initProject` prunes template deps through
 * `filterAllowed` so every generated app starts from a compliant base.
 */

// Core packages every Expo project lists directly and that are always fine.
const CORE = new Set([
  "react",
  "react-dom",
  "react-native",
  "react-native-web",
  "expo",
]);

// The ONLY external native modules allowed — the expo-router-required stack
// that ships in the default template and cannot be dropped. Every other native
// module is a violation by design.
const TEMPLATE_NATIVE_STACK = new Set([
  "react-native-gesture-handler",
  "react-native-reanimated",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-worklets",
]);

// Packages Expo Go bundles but the project deliberately does NOT support.
// @expo/ui was dropped from the UI stack — generated apps must use plain
// React Native components (see jobs/generate.ts AGENT_CONTEXT).
const DENIED = new Set(["@expo/ui"]);

export interface DepValidation {
  ok: boolean;
  violations: string[];
  warnings: string[];
}

function isExpoModule(name: string): boolean {
  return name.startsWith("expo-") || name.startsWith("@expo/");
}

/** Strict allow-list check for a single direct dependency. */
export function isAllowed(name: string): boolean {
  if (DENIED.has(name)) return false;
  return (
    CORE.has(name) ||
    isExpoModule(name) ||
    TEMPLATE_NATIVE_STACK.has(name) ||
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
 * Validate a generated package.json's direct dependencies against the strict
 * "expo-* only" allow-list. Returns the packages that are NOT allowed.
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
