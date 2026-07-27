import type { MetadataRoute } from "next";

import { getPublicLists } from "@/lib/lists";
import { getSiteUrl } from "@/lib/site";

// Sem isso, o Next trata /sitemap.xml como estático e ele só é regerado num
// novo deploy — uma lista virando pública entre deploys nunca apareceria
// aqui. 1h é frequência de sobra pra sitemap (o Google não crawleia mais
// rápido que isso de qualquer forma).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const publicLists = await getPublicLists();

  return [
    { url: `${base}/`, lastModified: new Date(), priority: 1.0, changeFrequency: "weekly" },
    { url: `${base}/signup`, lastModified: new Date(), priority: 0.5, changeFrequency: "monthly" },
    { url: `${base}/login`, lastModified: new Date(), priority: 0.3, changeFrequency: "yearly" },
    { url: `${base}/privacidade`, lastModified: new Date(), priority: 0.2, changeFrequency: "yearly" },
    { url: `${base}/termos`, lastModified: new Date(), priority: 0.2, changeFrequency: "yearly" },
    ...publicLists.map(({ username, slug, updatedAt }) => ({
      url: `${base}/l/${username}/${slug}`,
      lastModified: updatedAt,
      priority: 0.4,
      changeFrequency: "weekly" as const,
    })),
  ];
}
