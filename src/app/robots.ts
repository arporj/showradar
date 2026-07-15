import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/privacidade", "/termos"],
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/feed",
          "/follow-requests",
          "/friends",
          "/history",
          "/library",
          "/search",
          "/settings",
          "/upcoming",
          "/title/",
          "/person/",
          "/user/",
          "/onboarding",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
