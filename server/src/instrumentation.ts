/**
 * Next.js instrumentation — start the job queue once, in the Node.js runtime,
 * when the server process boots.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startQueue } = await import("@/lib/queue");
    startQueue();
  }
}
