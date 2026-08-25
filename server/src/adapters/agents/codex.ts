import type { AgentAdapter, AgentRunRequest } from "@/contracts/agent";
import { commandExists, spawnToEvents } from "./process";

/** OpenAI Codex CLI adapter. `codex exec` is the headless entry point. */
export const codexAdapter: AgentAdapter = {
  name: "codex",

  async isAvailable(): Promise<boolean> {
    return commandExists("codex");
  },

  run(req: AgentRunRequest) {
    const args = ["exec", "--dangerously-bypass-approvals-and-sandbox"];
    if (req.credentials?.model) {
      // "GPT only" per the Settings model picker — codex CLI default when unset.
      args.push("--model", req.credentials.model);
    }
    args.push(req.prompt);
    return spawnToEvents("codex", args, {
      cwd: req.projectDir,
      env: {
        ...process.env,
        ...req.env,
        ...(req.credentials?.apiKey
          ? { OPENAI_API_KEY: req.credentials.apiKey }
          : {}),
      },
    }, req.signal);
  },
};
