import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / driver modules must not be bundled by Turbopack.
  serverExternalPackages: ["better-sqlite3", "pg", "mysql2"],
};

export default nextConfig;
