import type { AgentAdapter, AgentRunRequest } from "@/contracts/agent";
import { commandExists, spawnToEvents } from "./process";

/** Anthropic Claude Code CLI adapter. `claude -p` is the print/headless mode. */
export const claudeAdapter: AgentAdapter = {
  name: "claude",

  async isAvailable(): Promise<boolean> {
    return commandExists("claude");
  },

  run(req: AgentRunRequest) {
    const args = ["-p", req.prompt, "--dangerously-skip-permissions"];
    return spawnToEvents("claude", args, {
      cwd: req.projectDir,
      env: {
        ...process.env,
        ...req.env,
        ...(req.credentials?.apiKey
          ? { ANTHROPIC_API_KEY: req.credentials.apiKey }
          : {}),
      },
    }, req.signal);
  },
};
