import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      // Links tipo "/v=1" compartilhados como cache-bust do preview do
      // WhatsApp (ele cacheia a imagem OG por URL) — sem isso caem em 404.
      {
        source: "/v=:id",
        destination: "/",
        permanent: false,
      },
    ];
  },
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      // TV Time GDPR export ZIPs are usually a few MB but can grow with years
      // of comments/reactions we never even read (src/lib/import/tv-time.ts).
      bodySizeLimit: "15mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "febaugmtskxkoswpxanr.supabase.co" },
    ],
  },
};

export default nextConfig;
