import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { storage } from "@/adapters/storage";
import { requestToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Revoke the current session token. */
export async function POST(req: Request) {
  const token = requestToken(req);
  if (token) {
    await storage.deleteSession(createHash("sha256").update(token).digest("hex"));
  }
  return NextResponse.json({ ok: true });
}