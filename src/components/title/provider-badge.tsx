import Image from "next/image";

import { getStreamingProviders } from "@/components/title/watch-providers";
import { tmdbImageUrl, type TmdbWatchProviderRegion } from "@/lib/tmdb";
import { tmdbImageLoader } from "@/lib/tmdb-image-loader";

/**
 * Selo discreto com o logo do provider de maior prioridade, posicionado no
 * canto inferior direito da capa/miniatura — o pai precisa ser `relative`.
 * Só o primeiro provider, nunca uma fileira de logos, pra não competir com a
 * arte do pôster. Reusado no dashboard, em "Em breve" e na grade.
 */
export function ProviderBadge({ providers }: { providers: unknown }) {
  const [provider] = getStreamingProviders(providers as TmdbWatchProviderRegion | null);
  const logo = provider ? tmdbImageUrl(provider.logo_path, "w45") : null;

  if (!provider || !logo) return null;

  return (
    <span
      title={provider.provider_name}
      className="absolute bottom-1 right-1 size-5 overflow-hidden rounded ring-1 ring-background"
    >
      <Image
        loader={tmdbImageLoader}
        src={logo}
        alt={provider.provider_name}
        fill
        sizes="20px"
        className="object-cover"
      />
    </span>
  );
}
