/**
 * Next.js instrumentation — start the job queue once, in the Node.js runtime,
 * when the server process boots, and make sure the default account exists.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startQueue } = await import("@/lib/queue");
    const { ensureSeedUser } = await import("@/lib/auth");
    await ensureSeedUser().catch((e) => console.error("[seed] failed:", e));
    startQueue();
  }
}
