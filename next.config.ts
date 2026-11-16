import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  experimental: {
    // src/proxy.ts runs on every non-static route (including the admin
    // upload routes) to refresh the Supabase session, and this Next.js
    // version buffers each proxied request body in memory so both proxy
    // and the route handler can read it - capped at 10MB by default. Audio
    // uploads are explicitly allowed up to 60MB (MAX_AUDIO_BYTES in
    // src/components/admin/course-input.ts), so anything over ~10MB was
    // silently truncated before reaching upload-audio/route.ts: no error
    // response came back at all, and the client fell back to its generic
    // "check your connection and file type" message instead of showing
    // the real cause. Raised past the largest upload this app allows
    // (60MB audio + a safety margin) so the proxy never truncates one.
    proxyClientMaxBodySize: "65mb",
  },
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
