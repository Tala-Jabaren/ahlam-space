import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: "https",
            hostname: new URL(supabaseUrl).hostname,
            port: "",
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    // Deliberately no Content-Security-Policy here - this app talks to
    // Supabase (auth redirects, storage, and would include realtime if it
    // starts using it) from the browser, and a CSP tight enough to matter
    // would need constant upkeep as those origins/subdomains change. These
    // four are safe, non-breaking defaults that don't touch cross-origin
    // fetches.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
