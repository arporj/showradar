import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return [
    { url: `${base}/`, lastModified: new Date(), priority: 1.0, changeFrequency: "weekly" },
    { url: `${base}/signup`, lastModified: new Date(), priority: 0.5, changeFrequency: "monthly" },
    { url: `${base}/login`, lastModified: new Date(), priority: 0.3, changeFrequency: "yearly" },
    { url: `${base}/privacidade`, lastModified: new Date(), priority: 0.2, changeFrequency: "yearly" },
    { url: `${base}/termos`, lastModified: new Date(), priority: 0.2, changeFrequency: "yearly" },
  ];
}
