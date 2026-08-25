import { NextResponse } from "next/server";
import { authUser, publicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Current authenticated user (used to restore sessions at app boot). */
export async function GET(req: Request) {
  const user = await authUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user: publicUser(user) });
}