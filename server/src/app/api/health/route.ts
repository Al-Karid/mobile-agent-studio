import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getAgent, listAgents } from "@/adapters/agents";
import { listValidators } from "@/adapters/validators";

export const dynamic = "force-dynamic";

/** Health + which agents/validators are installed and usable. */
export async function GET() {
  const agents: Record<string, boolean> = {};
  for (const name of listAgents()) {
    agents[name] = await getAgent(name).isAvailable();
  }

  return NextResponse.json({
    ok: true,
    defaultAgent: config.defaultAgent,
    model: config.deepseek.model,
    agents,
    validators: listValidators(),
  });
}
