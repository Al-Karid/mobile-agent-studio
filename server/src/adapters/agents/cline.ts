import type { AgentAdapter, AgentRunRequest } from "@/contracts/agent";
import { commandExists, spawnToEvents } from "./process";

/**
 * Cline CLI adapter (headless). Invocation validated against cline 3.0.57:
 *   cline -c <dir> -P deepseek -m <model> --json "<prompt>"
 * Act mode + auto-approve are the defaults when a prompt is passed. The
 * DeepSeek provider/key live in ~/.cline (same config as the VS Code extension).
 */
export const clineAdapter: AgentAdapter = {
  name: "cline",

  async isAvailable(): Promise<boolean> {
    return commandExists("cline");
  },

  run(req: AgentRunRequest) {
    const defaultModel = req.env?.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
    const provider = req.credentials?.provider ?? "deepseek";
    const model = req.credentials?.model ?? defaultModel;
    // --thinking none: generate directly (DeepSeek's default thinking mode streams
    // reasoning tokens endlessly, which is slow, costly and floods the run log).
    const args = ["-c", req.projectDir, "-P", provider];
    if (req.credentials?.apiKey) {
      // The user's own key overrides whatever ~/.cline has configured.
      args.push("-k", req.credentials.apiKey);
    }
    args.push("-m", model, "--thinking", "none", "--json", buildPrompt(req));
    return spawnToEvents("cline", args, {
      cwd: req.projectDir,
      env: { ...process.env, ...req.env },
    }, req.signal);
  },
};

function buildPrompt(req: AgentRunRequest): string {
  const ctx = req.context ? `\n\n## Project rules (must follow)\n${req.context}\n` : "";
  return `${req.prompt}${ctx}`;
}
