import type { AgentAdapter, AgentRunRequest } from "@/contracts/agent";
import { commandExists, spawnToEvents } from "./process";
import { decodeAgentOutput } from "./decoders";

/** Anthropic Claude Code CLI adapter. `claude -p` is the print/headless mode. */
export const claudeAdapter: AgentAdapter = {
  name: "claude",

  async isAvailable(): Promise<boolean> {
    return commandExists("claude");
  },

  run(req: AgentRunRequest) {
    const args = ["-p", req.prompt, "--dangerously-skip-permissions"];
    if (req.credentials?.model) {
      args.push("--model", req.credentials.model);
    }
    return decodeAgentOutput("claude", spawnToEvents("claude", args, {
      cwd: req.projectDir,
      env: {
        ...process.env,
        ...req.env,
        ...(req.credentials?.apiKey
          ? { ANTHROPIC_API_KEY: req.credentials.apiKey }
          : {}),
      },
    }, req.signal));
  },
};
