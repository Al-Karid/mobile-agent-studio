import fs from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { storage } from "@/adapters/storage";
import { publish } from "@/lib/sse";
import { getAgent } from "@/adapters/agents";
import { getValidator } from "@/adapters/validators";
import { resolveCredentials } from "@/lib/agent-credentials";
import { validateDeps } from "@/lib/expo-go";
import { gitInit, gitCommit } from "@/lib/git";
import { runCommand } from "@/lib/exec";
import {
  extractAgentQuestion,
  extractAgentResponse,
  formatQuestionMessage,
  type AgentQuestion,
} from "@/lib/agent-markers";
import type { Project, ProjectStatus, Run } from "@/contracts/storage";

/**
 * The generate pipeline: init → agent → qa → ready.
 * Every step is journaled to SQLite + broadcast over SSE, and committed to git,
 * so a disconnected client (or a crash) can resume from the last checkpoint.
 */

const AGENT_CONTEXT = `You are generating an Expo (React Native) app that MUST run in Expo Go.

Hard rules:
- Target the LATEST Expo SDK.
- Use expo-router for navigation and @expo/ui for native UI (sheets, pickers, toggles, menus) — never community libraries like @gorhom/bottom-sheet when @expo/ui provides it.
- Only depend on packages in the Expo Go allow-list (expo-* modules + the official third-party list). If the user asks for something outside it, choose an Expo Go-safe alternative instead.
- Run \`npx tsc --noEmit\` and fix all errors before finishing.
- Never create or edit ios/ or android/ by hand (Continuous Native Generation).

Reporting:
- When you finish the work, output a final line starting with \`AGENT_RESPONSE:\` followed by ONE concise, user-facing sentence summarizing what you changed (no markdown, no bullet lists). Example: \`AGENT_RESPONSE: Your app icon is now dark.\`
- If you MUST ask the user something before continuing (a choice only they can make, e.g. which color, which name), STOP and output \`AGENT_QUESTION:\` + the question on one line, then \`OPTIONS:\` with one \`- option\` per line. Do NOT write any app files after asking.`;

type Handler = (type: string, message: string) => Promise<void>;

export async function runGenerateJob(run: Run, project: Project): Promise<void> {
  const projectId = project.id;
  const dir = path.join(config.projectsDir, projectId);

  const emit: Handler = async (type, message) => {
    await storage.addEvent({ projectId, runId: run.id, type, message });
    publish({ projectId, runId: run.id, type, message, at: Date.now() });
  };
  const log = async (chunk: string) => storage.appendRunLog(run.id, chunk);
  const setStatus = async (s: ProjectStatus) => {
    await storage.setProjectStatus(projectId, s);
    await emit("status", s);
  };

  try {
    // 1. initialize
    await setStatus("initializing");
    await initProject(dir, project.agent);
    await emit("log", "project initialized");

    // 2. generate
    await setStatus("generating");
    const adapter = getAgent(project.agent);
    const env = {
      DEEPSEEK_API_KEY: config.deepseek.apiKey,
      DEEPSEEK_BASE_URL: config.deepseek.baseUrl,
      DEEPSEEK_MODEL: config.deepseek.model,
    };
    // The agent uses the PROJECT OWNER's saved provider keys when available.
    const ownerSettings = await storage.listSettings(project.user_id);
    const credentials = resolveCredentials(
      ownerSettings,
      project.agent,
      config.deepseek.model
    );
    const controller = new AbortController();
    let exitCode = 0;
    let buffer = "";
    let question: AgentQuestion | null = null;
    for await (const ev of adapter.run({
      projectDir: dir,
      prompt: run.input ?? project.prompt,
      context: AGENT_CONTEXT,
      env: { ...env, ...credentials.env },
      credentials,
      signal: controller.signal,
    })) {
      if (ev.type === "output") {
        await log(ev.data);
        // Keep a rolling tail so the AGENT_* markers are found even when the
        // output arrives split across chunks.
        buffer = (buffer + ev.data).slice(-8000);
        question = extractAgentQuestion(buffer);
        if (question) {
          controller.abort();
          break;
        }
      } else if (ev.type === "error") {
        await log(`[stderr] ${ev.data}`);
      } else if (ev.type === "done") {
        exitCode = ev.exitCode;
      }
    }

    // The agent asked the user a question: journal it and wait for their
    // answer (a new correction run). Don't QA/commit a half-built tree.
    if (question) {
      await storage.addEvent({
        projectId,
        runId: run.id,
        type: "question",
        message: formatQuestionMessage(question),
      });
      await storage.setProjectStatus(projectId, "awaiting_input");
      await emit("status", "awaiting_input");
      await storage.setRunStatus(run.id, "done");
      return;
    }

    const agentResponse = extractAgentResponse(buffer);
    if (exitCode !== 0) {
      throw new Error(`agent exited with code ${exitCode}`);
    }

    // 3. qa
    await setStatus("qa");
    const qa = await runQa(dir);
    await emit(
      "log",
      `qa: typecheck=${qa.typecheckLog}, expo-go violations=${qa.violations.length}`
    );

    if (qa.violations.length > 0) {
      await setStatus("needs_dev_build");
      await emit(
        "error",
        `These dependencies are not in Expo Go and require a development build: ${qa.violations.join(", ")}`
      );
      await storage.setRunStatus(run.id, "done");
      return;
    }
    if (!qa.typecheckOk) {
      throw new Error("typecheck failed — see run log");
    }

    // Journal the agent's concise response (shown as the chat's agent turn).
    if (agentResponse) {
      await storage.addEvent({
        projectId,
        runId: run.id,
        type: "agent_response",
        message: agentResponse,
      });
    }

    // 4. commit + ready
    const commit = await gitCommit(dir, "generated by mobile-agent-studio");
    await storage.setRunCommit(run.id, commit ?? "no-change");

    // 5. optional validator (V1 = none / human)
    const validator = getValidator(config.defaultValidator);
    const vres = await validator.validate(dir);
    if (!vres.ok) {
      throw new Error(`validator failed: ${vres.details.join("; ")}`);
    }

    await setStatus("ready");
    await emit("ready", "App is ready — review it in Expo Go, then tap Launch");
    await storage.setRunStatus(run.id, "done");
  } catch (err) {
    await storage.setRunError(run.id, err instanceof Error ? err.message : String(err));
    await storage.setProjectStatus(projectId, "failed");
    await emit("error", err instanceof Error ? err.message : String(err));
    await storage.setRunStatus(run.id, "failed");
  }
}

async function initProject(dir: string, agent: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true });

  // dry-run writes its own minimal project; real agents need a scaffold.
  if (agent !== "dry-run" && !fs.existsSync(path.join(dir, "package.json"))) {
    const r = await runCommand(
      "npx",
      ["create-expo-app@latest", ".", "--template", "default", "--yes"],
      { cwd: dir, timeoutMs: 300_000 }
    );
    if (r.code !== 0) {
      throw new Error(`create-expo-app failed: ${r.stderr.slice(-500)}`);
    }
  }

  if (!fs.existsSync(path.join(dir, ".git"))) {
    await gitInit(dir);
  }
}

async function runQa(dir: string): Promise<{
  violations: string[];
  typecheckOk: boolean;
  typecheckLog: string;
}> {
  let violations: string[] = [];
  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    violations = validateDeps(pkg).violations;
  }

  let typecheckOk = true;
  let typecheckLog = "skipped (no tsconfig)";
  if (fs.existsSync(path.join(dir, "tsconfig.json"))) {
    const r = await runCommand("npx", ["tsc", "--noEmit"], { cwd: dir, timeoutMs: 120_000 });
    typecheckOk = r.code === 0;
    typecheckLog = typecheckOk ? "ok" : "failed";
  }

  return { violations, typecheckOk, typecheckLog };
}

