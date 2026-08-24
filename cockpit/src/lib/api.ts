import { getApiUrl } from "./settings";

export interface Project {
  id: string;
  name: string;
  prompt: string;
  status: string;
  exp_url: string | null;
  agent: string;
  model: string;
  created_at: number;
}

export interface Run {
  id: number;
  kind: string;
  status: string;
  input: string | null;
  agent: string | null;
  error: string | null;
  log: string;
}

export interface StudioEvent {
  id: number;
  project_id: string;
  run_id: number | null;
  type: string;
  message: string;
  created_at: number;
}

export interface ProjectDetail extends Project {
  runs: Run[];
  events: StudioEvent[];
}

async function base(): Promise<string> {
  return (await getApiUrl()).replace(/\/+$/, "");
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${await base()}/api/projects`);
  return json<Project[]>(res);
}

export async function createProject(input: {
  name: string;
  prompt: string;
  agent?: string;
}): Promise<{ project: Project; run: Run }> {
  const res = await fetch(`${await base()}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return json(res);
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const res = await fetch(`${await base()}/api/projects/${id}`);
  return json<ProjectDetail>(res);
}

export async function sendPrompt(id: string, prompt: string): Promise<{ run: Run }> {
  const res = await fetch(`${await base()}/api/projects/${id}/prompts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return json(res);
}

export async function launchProject(id: string): Promise<{ run: Run }> {
  const res = await fetch(`${await base()}/api/projects/${id}/launch`, { method: "POST" });
  return json(res);
}

export async function health(): Promise<{ ok: boolean; defaultAgent: string; model: string }> {
  const res = await fetch(`${await base()}/api/health`);
  return json(res);
}
