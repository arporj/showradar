import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { tmdbImageUrl } from "@/lib/tmdb";

export function TitleCard({
  href,
  posterPath,
  name,
  children,
}: {
  href: string;
  posterPath: string | null;
  name: string;
  children?: ReactNode;
}) {
  const poster = tmdbImageUrl(posterPath, "w342");

  return (
    <Link href={href} className="block space-y-2">
      <div className="relative aspect-2/3 overflow-hidden rounded-lg bg-muted">
        {poster ? (
          <Image src={poster} alt={name} fill sizes="200px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
            Sem capa
          </div>
        )}
      </div>
      <div>
        <p className="line-clamp-1 text-sm font-medium">{name}</p>
        {children}
      </div>
    </Link>
  );
}
