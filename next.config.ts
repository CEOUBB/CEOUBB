import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const scriptSrc = process.env.NODE_ENV === "production" ? "'self' 'unsafe-inline' https://apis.google.com" : "'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com http://localhost:8400";
const remoteConnectSrc = "https://*.googleapis.com https://*.firebaseio.com https://*.firebasestorage.app https://accounts.google.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io";
const connectSrc = process.env.NODE_ENV === "production" ? `'self' ${remoteConnectSrc}` : `'self' ws://localhost:* ws://127.0.0.1:* http://localhost:8400 ${remoteConnectSrc}`;

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-src https://*.firebaseapp.com https://apis.google.com https://accounts.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/biblioteca/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" }],
      },
      {
        source: "/biblioteca/assets/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path(brand|icons)/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "ceoubb",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
