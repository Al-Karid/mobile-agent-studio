import type { AgentAdapter, AgentRunRequest } from "@/contracts/agent";
import { commandExists, spawnToEvents } from "./process";

/**
 * Cline CLI adapter.
 *
 * NOTE: the exact headless invocation of the Cline CLI is parameterized via
 * CLINE_COMMAND and may need validation against the installed CLI version.
 * DeepSeek is passed through the environment (OpenAI-compatible provider).
 */
export const clineAdapter: AgentAdapter = {
  name: "cline",

  async isAvailable(): Promise<boolean> {
    return commandExists("cline");
  },

  run(req: AgentRunRequest) {
    const prompt = buildPrompt(req);
    const args = ["-p", prompt, "--dangerously-skip-permissions"];
    return spawnToEvents("cline", args, {
      cwd: req.projectDir,
      env: { ...process.env, ...req.env },
    });
  },
};

function buildPrompt(req: AgentRunRequest): string {
  const ctx = req.context ? `\n\n## Project rules (must follow)\n${req.context}\n` : "";
  return `${req.prompt}${ctx}`;
}
