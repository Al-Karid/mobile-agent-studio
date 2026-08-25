import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { storage } from "@/adapters/storage";
import { createSession, hashPassword, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Create an email/password account and return a session token. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return NextResponse.json(
      { error: "valid email and password (min 8 chars) required" },
      { status: 400 }
    );
  }
  if (await storage.getUserByEmail(email)) {
    return NextResponse.json({ error: "email already registered" }, { status: 409 });
  }

  const user = await storage.createUser({
    id: randomUUID(),
    email,
    passwordHash: hashPassword(password),
    provider: "email",
  });
  const token = await createSession(user.id);
  return NextResponse.json({ token, user: publicUser(user) }, { status: 201 });
}