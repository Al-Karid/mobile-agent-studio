import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native N-API module — must not be bundled.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
