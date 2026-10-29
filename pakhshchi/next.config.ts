import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.224.150.158"],
  turbopack: { root: __dirname },
};

export default nextConfig;