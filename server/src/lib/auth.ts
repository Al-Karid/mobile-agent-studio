import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { storage } from "@/adapters/storage";
import type { User } from "@/contracts/storage";

/**
 * Auth primitives — password hashing (scrypt), opaque session tokens (stored
 * hashed), the bearer-token lookup, and the boot seed user. Scaling-ready:
 * Google/GitHub OAuth users just get provider/provider_id rows + a session.
 */

/** Deterministic id for the seeded default account. */
export const SEED_USER_ID = "user-al-cisse";
export const SEED_EMAIL = "al.cisse@revalys.com";
export const SEED_PASSWORD = "password1234";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function randomToken(): string {
  return randomBytes(32).toString("hex");
}

/** Create a session for a user; returns the raw token to hand to the client. */
export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  await storage.createSession(userId, hashToken(token));
  return token;
}

/** Extract the raw bearer token from a request, if present. */
export function requestToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const [scheme, token] = h.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

/** Resolve the authenticated user from a request, or null (401 → caller). */
export async function authUser(req: Request): Promise<User | null> {
  const token = requestToken(req);
  if (!token) return null;
  return (await storage.getUserBySessionToken(hashToken(token))) ?? null;
}

/** The user shape that's safe to return to clients (no password hash). */
export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    provider: u.provider,
    display_name: u.display_name,
  };
}

/** Caller + their project, or null when unauthenticated or not the owner. */
export async function authOwnedProject(req: Request, projectId: string) {
  const user = await authUser(req);
  if (!user) return null;
  const project = await storage.getProject(projectId);
  if (!project || project.user_id !== user.id) return null;
  return { user, project };
}

/** Ensure the default dev account exists (boot seed). */
export async function ensureSeedUser(): Promise<void> {
  const existing = await storage.getUserByEmail(SEED_EMAIL);
  if (existing) return;
  await storage.createUser({
    id: SEED_USER_ID,
    email: SEED_EMAIL,
    passwordHash: hashPassword(SEED_PASSWORD),
    provider: "email",
    displayName: "Default user",
  });
}