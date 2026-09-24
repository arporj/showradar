import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SocialActivityRow } from "@/components/social/social-activity-row";
import { BackButton } from "@/components/ui/back-button";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSocialActivity } from "@/lib/social";

// Todos os títulos (filmes, séries e episódios) em que a pessoa deu nota ou
// comentou. A regra de visibilidade das notas é a mesma da aba "Recentes" de
// /social (ver getSocialActivity): perfil fechado só mostra nota a quem o
// segue com pedido aceito — os comentários, que já são públicos, aparecem
// sempre.
export default async function UserSocialPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { username } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);

  const session = await auth();
  if (!session?.user) redirect("/login");

  const [targetUser] = await db
    .select({ id: users.id, username: users.username, name: users.name })
    .from(users)
    .where(eq(users.username, username));
  if (!targetUser) notFound();

  const { items, hasMore } = await getSocialActivity({ viewerId: session.user.id, authorId: targetUser.id, page });

  const displayName = targetUser.name ?? targetUser.username ?? "";
  const pageHref = (p: number) => (p > 1 ? `/user/${username}/social?page=${p}` : `/user/${username}/social`);

  return (
    <div className="max-w-2xl space-y-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notas e comentários</h1>
        <p className="text-muted-foreground">
          Tudo o que{" "}
          <Link href={`/user/${username}`} className="hover:underline">
            {displayName}
          </Link>{" "}
          avaliou ou comentou.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {page > 1 ? "Não há mais itens." : `${displayName} ainda não avaliou nem comentou nada visível para você.`}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <SocialActivityRow key={item.key} item={item} />
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="underline-offset-4 hover:underline">
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={pageHref(page + 1)} className="underline-offset-4 hover:underline">
              Próximos →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
