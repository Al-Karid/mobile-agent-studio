import fs from "node:fs";
import path from "node:path";
import type { AgentAdapter, AgentEvent, AgentRunRequest } from "@/contracts/agent";
import { decodeAgentOutput } from "./decoders";

/**
 * dry-run adapter — simulates a coding agent without any CLI, API key, or
 * network. Writes a minimal, Expo Go-safe app that renders the prompt. Lets the
 * full pipeline (create → generate → qa → ready → launch) be exercised offline.
 */
export const dryRunAdapter: AgentAdapter = {
  name: "dry-run",

  async isAvailable(): Promise<boolean> {
    return true;
  },

  run(req: AgentRunRequest) {
    return decodeAgentOutput("dry-run", dryRunStream(req));
  },
};

async function* dryRunStream(
  req: AgentRunRequest
): AsyncGenerator<AgentEvent, void, unknown> {
  yield { type: "output", data: `[dry-run] generating a minimal Expo app for: ${req.prompt}\n` };

  await sleep(1200);

  writeMinimalApp(req.projectDir, req.prompt);

  yield { type: "output", data: "[dry-run] wrote app.json, package.json, App.js\n" };
  yield { type: "output", data: "[dry-run] done — Expo Go-safe, no native modules\n" };
  yield { type: "output", data: "AGENT_RESPONSE: Done — a minimal Expo Go-safe app is ready to run.\n" };
  yield { type: "done", exitCode: 0 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function writeMinimalApp(dir: string, prompt: string): void {
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: "generated-app",
        version: "1.0.0",
        main: "index.js",
        scripts: { start: "expo start", android: "expo start --android", ios: "expo start --ios" },
        dependencies: {
          expo: "~57.0.15",
          "expo-status-bar": "~57.0.1",
          react: "19.2.3",
          "react-native": "0.86.2",
        },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(dir, "app.json"),
    JSON.stringify(
      {
        expo: {
          name: "Generated App",
          slug: "generated-app",
          version: "1.0.0",
          orientation: "portrait",
          userInterfaceStyle: "light",
          newArchEnabled: true,
        },
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(dir, "index.js"),
    `import { registerRootComponent } from "expo";
import App from "./App";
registerRootComponent(App);
`
  );

  const escaped = prompt.replace(/`/g, "\\`").replace(/\${/g, "\\${");
  fs.writeFileSync(
    path.join(dir, "App.js"),
    `import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generated App</Text>
      <Text style={styles.prompt}>${escaped}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700" },
  prompt: { marginTop: 12, fontSize: 14, color: "#666", textAlign: "center" },
});
`
  );
}
