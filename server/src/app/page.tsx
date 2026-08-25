"use client";

import { useCallback, useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  prompt: string;
  status: string;
  exp_url: string | null;
  agent: string;
  model: string;
  created_at: number;
}

interface Health {
  ok: boolean;
  defaultAgent: string;
  model: string;
  agents: Record<string, boolean>;
  validators: string[];
}

const STATUS_COLORS: Record<string, string> = {
  created: "#8a8f98",
  initializing: "#f5a623",
  generating: "#f5a623",
  qa: "#f5a623",
  ready: "#2ecc40",
  launching: "#f5a623",
  launched: "#4aa3ff",
  needs_dev_build: "#ff4136",
  awaiting_input: "#8b5cf6",
  failed: "#ff4136",
  interrupted: "#ff851b",
};

const STATUS_ACTION: Record<string, string> = {
  ready: "Launch",
  launched: "Launch again",
};

export default function Admin() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [agent, setAgent] = useState("dry-run");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/projects").then((r) => r.json());
      setProjects(Array.isArray(r) ? r : []);
    } catch {
      /* server not up yet */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, prompt, agent }),
      });
      setName("");
      setPrompt("");
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function launch(id: string) {
    await fetch(`/api/projects/${id}/launch`, { method: "POST" });
    refresh();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 24 }}>Mobile Agent Studio</h1>
      {health && (
        <p style={{ color: "#8a8f98", fontSize: 13 }}>
          model: {health.model} · default agent: {health.defaultAgent} · agents
          installed:{" "}
          {Object.entries(health.agents)
            .filter(([, ok]) => ok)
            .map(([n]) => n)
            .join(", ") || "none (use dry-run)"}
        </p>
      )}

      <form
        onSubmit={create}
        style={{ display: "flex", flexDirection: "column", gap: 8, margin: "20px 0" }}
      >
        <input
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        <textarea
          placeholder="Describe the app you want…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          style={inputStyle}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={agent} onChange={(e) => setAgent(e.target.value)} style={inputStyle}>
            <option value="dry-run">dry-run (no API key)</option>
            <option value="cline">cline</option>
            <option value="codex">codex</option>
            <option value="claude">claude</option>
          </select>
          <button disabled={busy} style={buttonStyle}>
            {busy ? "…" : "Create project"}
          </button>
        </div>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {projects.map((p) => (
          <div key={p.id} style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <strong>{p.name}</strong>
              <span
                style={{
                  color: STATUS_COLORS[p.status] ?? "#999",
                  fontSize: 12,
                  border: `1px solid ${STATUS_COLORS[p.status] ?? "#999"}`,
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {p.status}
              </span>
              <span style={{ color: "#666", fontSize: 12 }}>
                {p.agent} · {new Date(p.created_at).toLocaleString()}
              </span>
            </div>
            <p style={{ color: "#8a8f98", fontSize: 13, margin: "6px 0" }}>{p.prompt}</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {STATUS_ACTION[p.status] && (
                <button onClick={() => launch(p.id)} style={buttonStyle}>
                  {STATUS_ACTION[p.status]}
                </button>
              )}
              {p.exp_url && (
                <a href={p.exp_url} style={{ fontSize: 13 }}>
                  {p.exp_url}
                </a>
              )}
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <p style={{ color: "#666" }}>No projects yet — create one above.</p>
        )}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  background: "#1a1d23",
  color: "#e6e8ec",
  border: "1px solid #2a2e37",
  borderRadius: 6,
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 14px",
  background: "#4aa3ff",
  color: "#0f1115",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  padding: 14,
  background: "#1a1d23",
  border: "1px solid #2a2e37",
  borderRadius: 8,
};
