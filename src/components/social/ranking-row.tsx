import Image from "next/image";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { RatingStars } from "@/components/title/rating-stars";
import type { RankingItem } from "@/lib/social";
import { tmdbImageUrl } from "@/lib/tmdb";
import { tmdbImageLoader } from "@/lib/tmdb-image-loader";

const TYPE_LABEL: Record<"movie" | "tv" | "episode", string> = {
  movie: "Filme",
  tv: "Série",
  episode: "Episódio",
};

export function RankingRow({ item, position }: { item: RankingItem; position: number }) {
  const poster = tmdbImageUrl(item.posterPath, "w185");
  const typeLabel = TYPE_LABEL[item.kind === "episode" ? "episode" : item.mediaType];
  // Média guardada em 1-10 (2 pontos por estrela) — exibida em estrelas.
  const averageStars = (item.average / 2).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span className="w-6 shrink-0 text-center text-sm font-medium text-muted-foreground">{position}</span>

      <Link href={item.href} className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
        {poster && <Image loader={tmdbImageLoader} src={poster} alt="" fill sizes="44px" className="object-cover" />}
      </Link>

      <div className="min-w-0 flex-1 space-y-1">
        <Link href={item.href} className="block truncate font-medium hover:underline">
          {item.name}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {typeLabel}
          {item.kind === "episode" &&
            ` • T${item.seasonNumber}E${item.episodeNumber}${item.episodeName ? ` • ${item.episodeName}` : ""}`}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <RatingStars value={Math.round(item.average)} readOnly size="sm" />
            <span className="text-sm font-medium">{averageStars}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {item.ratingCount} {item.ratingCount === 1 ? "pessoa avaliou" : "pessoas avaliaram"}
          </span>
        </div>
      </div>

      <Link
        href={item.commentsHref}
        prefetch={false}
        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`${item.commentCount} ${item.commentCount === 1 ? "comentário" : "comentários"}`}
      >
        <MessageSquare className="size-4" />
        {item.commentCount}
      </Link>
    </div>
  );
}
