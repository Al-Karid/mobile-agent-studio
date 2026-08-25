import { NextResponse } from "next/server";
import { storage } from "@/adapters/storage";
import { createSession, publicUser, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Log in with email/password and return a session token. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  const user = await storage.getUserByEmail(email);
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "invalid email or password" }, { status: 401 });
  }

  const token = await createSession(user.id);
  return NextResponse.json({ token, user: publicUser(user) });
}