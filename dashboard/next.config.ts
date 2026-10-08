import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image builds with NEXT_OUTPUT=standalone to ship only the
  // traced runtime files (see dashboard/Dockerfile). Local `next start` is
  // unaffected.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
