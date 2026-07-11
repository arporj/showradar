import Image from "next/image";
import Link from "next/link";

import { tmdbImageUrl, type TmdbWatchProviderRegion } from "@/lib/tmdb";

export function WatchProviders({ providers }: { providers: TmdbWatchProviderRegion | null }) {
  if (!providers) return null;

  const seen = new Set<number>();
  const streaming = [...(providers.flatrate ?? []), ...(providers.free ?? []), ...(providers.ads ?? [])]
    .filter((provider) => {
      if (seen.has(provider.provider_id)) return false;
      seen.add(provider.provider_id);
      return true;
    })
    .sort((a, b) => a.display_priority - b.display_priority);

  if (streaming.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h2 className="text-sm font-medium">Onde assistir</h2>
      <div className="flex flex-wrap items-center gap-2">
        {streaming.map((provider) => {
          const logo = tmdbImageUrl(provider.logo_path, "w92");
          return (
            <Link
              key={provider.provider_id}
              href={providers.link}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={provider.provider_name}
              className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted"
            >
              {logo && <Image src={logo} alt={provider.provider_name} fill sizes="36px" className="object-cover" />}
            </Link>
          );
        })}
      </div>
      <Link
        href={providers.link}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Dados de streaming via JustWatch
      </Link>
    </div>
  );
}
