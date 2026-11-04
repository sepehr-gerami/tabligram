import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.58.13.158'],
  turbopack: { root: __dirname },
};

export default nextConfig;