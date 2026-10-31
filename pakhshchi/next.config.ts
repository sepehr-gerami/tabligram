import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.82.158"],
  turbopack: { root: __dirname },
};

export default nextConfig;