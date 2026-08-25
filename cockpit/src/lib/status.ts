/** Shared status → color / chat-step mapping for the cockpit. */
export const STATUS_COLORS: Record<string, string> = {
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

/** How a project status reads inside an agent turn's step list. */
export const STATUS_STEPS: Record<string, string> = {
  initializing: "initializing",
  generating: "generating",
  qa: "checking",
  ready: "done",
  needs_dev_build: "needs a development build",
  launching: "launching",
  launched: "running",
  awaiting_input: "waiting for your input",
  failed: "failed",
  interrupted: "interrupted",
};

export function statusColor(status: string | undefined): string {
  return (status && STATUS_COLORS[status]) ?? "#999";
}
