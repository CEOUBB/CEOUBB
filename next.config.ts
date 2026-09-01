import type { NextConfig } from "next";

/*
  La WebView de Capacitor sirve el bridge desde `capacitor://localhost` (Android) y
  `https://localhost` (iOS): sin esos orígenes el puente muere y la app queda en blanco.
  App Check añade únicamente los orígenes oficiales de reCAPTCHA a script, conexión y frame.
*/
// Implements: REQ-CAP-14
const capacitorBridgeOrigins = "capacitor://localhost https://localhost";
const scriptSrc =
  process.env.NODE_ENV === "production"
    ? `'self' 'unsafe-inline' https://apis.google.com ${capacitorBridgeOrigins}`
    : `'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com http://localhost:8400 ${capacitorBridgeOrigins}`;
const remoteConnectSrc =
  "https://*.googleapis.com https://*.firebaseio.com https://*.firebasestorage.app https://accounts.google.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io";
const connectSrc =
  process.env.NODE_ENV === "production"
    ? `'self' ${remoteConnectSrc} ${capacitorBridgeOrigins}`
    : `'self' ws://localhost:* ws://127.0.0.1:* http://localhost:8400 ${remoteConnectSrc} ${capacitorBridgeOrigins}`;

const contentSecurityPolicy = [
  `default-src 'self' ${capacitorBridgeOrigins}`,
  `script-src ${scriptSrc} https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.firebasestorage.app https://*.googleusercontent.com https://accounts.google.com https://lh3.googleusercontent.com https://*.googleapis.com",
  "font-src 'self' data:",
  `connect-src ${connectSrc} https://www.google.com/recaptcha/`,
  "frame-src https://*.firebaseapp.com https://apis.google.com https://accounts.google.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "@phosphor-icons/react",
      "@phosphor-icons/react/ssr",
      "katex",
      "highlight.js",
      "motion",
      "vaul",
      "zod",
      "drizzle-orm",
    ],
  },
  productionBrowserSourceMaps: false,
  allowedDevOrigins: ["192.168.1.7", "192.168.1.*", "localhost", "127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), display-capture=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
      {
        source: "/biblioteca/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/biblioteca/assets/vendor/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path(brand|icons)/:file*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
};

export default nextConfig;
