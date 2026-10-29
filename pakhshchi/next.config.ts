import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project lives below a parent folder that also has a package-lock.json
  // (and sits under a Git repository rooted at C:/). Pinning the Turbopack root
  // keeps builds deterministic and silences Next.js' "package-lock.json is outside
  // the current Git repository" warning. No behavior of the app changes.
  turbopack: { root: __dirname },
};

export default nextConfig;
