import * as SecureStore from "expo-secure-store";
import { getApiUrl } from "./settings";

const TOKEN_KEY = "mas.token";

/** Session token, stored in the iOS keychain. */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* secure-store unavailable — auth will simply fail */
  }
}

export type ProjectPlatform = "ios" | "android" | "both";

export interface Project {
  id: string;
  name: string;
  prompt: string;
  status: string;
  exp_url: string | null;
  agent: string;
  model: string;
  platform: ProjectPlatform;
  created_at: number;
  updated_at: number;
}

export interface Run {
  id: number;
  project_id: string;
  kind: string;
  status: string;
  input: string | null;
  agent: string | null;
  model: string | null;
  log: string;
  error: string | null;
  commit_sha: string | null;
  created_at: number;
  finished_at: number | null;
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

export interface AuthUser {
  id: string;
  email: string | null;
  provider: string;
  display_name: string | null;
}

async function base(): Promise<string> {
  return (await getApiUrl()).replace(/\/+$/, "");
}

/** Attach the auth header (when logged in) to a request. */
async function withAuth(init: RequestInit = {}): Promise<RequestInit> {
  const token = await getToken();
  return {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  };
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── auth ──────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${await base()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return json(res);
}

export async function register(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${await base()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return json(res);
}

export async function logout(): Promise<void> {
  const res = await fetch(`${await base()}/api/auth/logout`, {
    method: "POST",
    ...(await withAuth()),
  });
  await json<{ ok: boolean }>(res);
}

export async function me(): Promise<AuthUser> {
  const res = await fetch(`${await base()}/api/auth/me`, await withAuth());
  return (await json<{ user: AuthUser }>(res)).user;
}

// ── provider settings ─────────────────────────────────────────────────────

export interface ProviderSettings {
  /** The user's default agent (cline | codex | claude). */
  agent: string;
  cline: {
    provider: string;
    model: string;
    keys: Record<string, string>;
  };
  codex: { model: string; key: string };
  claude: { model: string; key: string };
}

export async function getProviderSettings(): Promise<ProviderSettings> {
  const res = await fetch(`${await base()}/api/settings/providers`, await withAuth());
  return json<ProviderSettings>(res);
}

export async function saveProviderSettings(body: {
  agent?: string;
  cline?: { provider?: string; model?: string; apiKey?: string };
  codex?: { model?: string; apiKey?: string };
  claude?: { model?: string; apiKey?: string };
}): Promise<void> {
  const res = await fetch(`${await base()}/api/settings/providers`, {
    method: "PUT",
    ...(await withAuth()),
    body: JSON.stringify(body),
  });
  await json<{ ok: boolean }>(res);
}

// ── projects ──────────────────────────────────────────────────────────────

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${await base()}/api/projects`, await withAuth());
  return json<Project[]>(res);
}

export async function createProject(input: {
  name: string;
  prompt: string;
  agent?: string;
  platform?: ProjectPlatform;
}): Promise<{ project: Project; run: Run }> {
  const res = await fetch(`${await base()}/api/projects`, {
    method: "POST",
    ...(await withAuth()),
    body: JSON.stringify(input),
  });
  return json(res);
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const res = await fetch(`${await base()}/api/projects/${id}`, await withAuth());
  return json<ProjectDetail>(res);
}

export async function sendPrompt(id: string, prompt: string): Promise<{ run: Run }> {
  const res = await fetch(`${await base()}/api/projects/${id}/prompts`, {
    method: "POST",
    ...(await withAuth()),
    body: JSON.stringify({ prompt }),
  });
  return json(res);
}

export async function launchProject(id: string): Promise<{ run: Run }> {
  const res = await fetch(`${await base()}/api/projects/${id}/launch`, {
    method: "POST",
    ...(await withAuth()),
  });
  return json(res);
}

export async function stopProject(id: string): Promise<{ project: Project }> {
  const res = await fetch(`${await base()}/api/projects/${id}/stop`, {
    method: "POST",
    ...(await withAuth()),
  });
  return json(res);
}

/** Change the project's agent (project settings → Agent). */
export async function updateProjectAgent(id: string, agent: string): Promise<Project> {
  const res = await fetch(`${await base()}/api/projects/${id}`, {
    method: "PATCH",
    ...(await withAuth()),
    body: JSON.stringify({ agent }),
  });
  return (await json<{ project: Project }>(res)).project;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${await base()}/api/projects/${id}`, {
    method: "DELETE",
    ...(await withAuth()),
  });
  await json<{ ok: boolean }>(res);
}

export async function health(): Promise<{ ok: boolean; defaultAgent: string; model: string }> {
  const res = await fetch(`${await base()}/api/health`);
  return json(res);
}
