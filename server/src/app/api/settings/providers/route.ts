import { NextResponse } from "next/server";
import { storage } from "@/adapters/storage";
import { authUser } from "@/lib/auth";
import {
  ALLOWED_AGENTS,
  maskKey,
  SETTING_KEYS,
} from "@/lib/agent-credentials";

export const dynamic = "force-dynamic";

const CLINE_PROVIDERS = ["deepseek", "openai", "anthropic"] as const;

/** Current user's default agent + per-agent model selection and masked keys. */
export async function GET(req: Request) {
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const s = await storage.listSettings(user.id);
  return NextResponse.json({
    agent: s[SETTING_KEYS.defaultAgent] ?? "cline",
    cline: {
      provider: s[SETTING_KEYS.clineProvider] ?? "deepseek",
      model: s[SETTING_KEYS.clineModel] ?? "",
      keys: Object.fromEntries(
        CLINE_PROVIDERS.map((p) => [p, maskKey(s[SETTING_KEYS.clineKey(p)])])
      ),
    },
    codex: {
      model: s[SETTING_KEYS.codexModel] ?? "",
      key: maskKey(s[SETTING_KEYS.codexKey]),
    },
    claude: {
      model: s[SETTING_KEYS.claudeModel] ?? "",
      key: maskKey(s[SETTING_KEYS.claudeKey]),
    },
  });
}

/** Save the default agent, per-agent models and API keys. Blank key = keep existing. */
export async function PUT(req: Request) {
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);

  const agent = String(body?.agent ?? "");
  if ((ALLOWED_AGENTS as readonly string[]).includes(agent)) {
    await storage.setSetting(user.id, SETTING_KEYS.defaultAgent, agent);
  }

  const clineProvider = body?.cline?.provider;
  if (
    clineProvider === "deepseek" ||
    clineProvider === "openai" ||
    clineProvider === "anthropic"
  ) {
    await storage.setSetting(user.id, SETTING_KEYS.clineProvider, clineProvider);
  }
  const clineModel = String(body?.cline?.model ?? "").trim();
  if (clineModel) {
    await storage.setSetting(user.id, SETTING_KEYS.clineModel, clineModel);
  }
  const clineKey = String(body?.cline?.apiKey ?? "").trim();
  if (clineKey) {
    await storage.setSetting(
      user.id,
      SETTING_KEYS.clineKey(clineProvider ?? "deepseek"),
      clineKey
    );
  }

  const codexModel = String(body?.codex?.model ?? "").trim();
  if (codexModel) {
    await storage.setSetting(user.id, SETTING_KEYS.codexModel, codexModel);
  }
  const codexKey = String(body?.codex?.apiKey ?? "").trim();
  if (codexKey) {
    await storage.setSetting(user.id, SETTING_KEYS.codexKey, codexKey);
  }

  const claudeModel = String(body?.claude?.model ?? "").trim();
  if (claudeModel) {
    await storage.setSetting(user.id, SETTING_KEYS.claudeModel, claudeModel);
  }
  const claudeKey = String(body?.claude?.apiKey ?? "").trim();
  if (claudeKey) {
    await storage.setSetting(user.id, SETTING_KEYS.claudeKey, claudeKey);
  }

  return NextResponse.json({ ok: true });
}