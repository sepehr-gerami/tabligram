import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * CSP سخت‌گیرانه برای تولید:
 * - اسکریپت: فقط same-origin (Next.js اسکریپت‌های inline خودش را تزریق می‌کند، پس unsafe-inline لازم است؛
 *   nonce-based CSP نیازمند middleware است و فعلاً از آن استفاده نمی‌کنیم).
 * - تصویر: آپلودهای خودمان + تصاویر خارجی https (کراتیو/بنر کاربران) + data/blob برای پیش‌نمایش.
 * - اتصال: فقط same-origin؛ در dev وب‌سوکت HMR هم مجاز می‌شود.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS فقط در تولید و روی HTTPS معنا دارد؛ ارسال آن در dev بی‌ضرر است ولی برای جلوگیری از قفل‌شدن localhost ارسال نمی‌کنیم.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.193.139.158"],
  turbopack: { root: __dirname },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // فایل‌های آپلودی کاربران هرگز نباید به‌صورت HTML/JS تفسیر شوند.
        source: "/api/files/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: "default-src 'none'; img-src 'self'; sandbox" },
        ],
      },
    ];
  },
};

export default nextConfig;
