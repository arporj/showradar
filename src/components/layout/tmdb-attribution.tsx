import Image from "next/image";
import Link from "next/link";

export function TmdbAttribution() {
  return (
    <Link
      href="https://www.themoviedb.org/"
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center gap-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground"
    >
      <Image src="/tmdb-logo.svg" alt="TMDB" width={77} height={10} className="h-3.5 w-auto" />
      <span className="underline">Este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.</span>
    </Link>
  );
}
