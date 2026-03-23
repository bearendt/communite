// apps/web/next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Strict Content Security Policy
// Tighten further in production by removing 'unsafe-eval' once Clerk supports it
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://clerk.communite.app https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://assets.communite.app https://img.clerk.com;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' https://api.clerk.com wss://*.ably.io https://*.neon.tech https://*.sanity.io;
  worker-src 'self' blob:;
  upgrade-insecure-requests;
`
  .replace(/\n/g, " ")
  .trim();

const nextConfig: NextConfig = {
  // Enforce TypeScript strict mode at build
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.communite.app" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          // HSTS — only active on HTTPS (prod)
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
      // Cache static assets aggressively
      {
        source: "/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Redirect bare /admin to /studio (Sanity)
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/studio",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
