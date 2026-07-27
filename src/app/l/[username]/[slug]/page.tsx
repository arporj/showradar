import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteListButton } from "@/components/lists/delete-list-button";
import { ListVisibilitySelect } from "@/components/lists/list-visibility-select";
import { RemoveFromListButton } from "@/components/lists/remove-from-list-button";
import { ShareListButton } from "@/components/lists/share-list-button";
import { TitleCard } from "@/components/library/title-card";
import { auth } from "@/lib/auth";
import { getListForView, getListItemsWithTitles } from "@/lib/lists";
import { getSiteUrl } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const row = await getListForView(username, slug);
  if (!row || row.list.visibility === "private") {
    return { title: "Lista não encontrada" };
  }

  const { list } = row;
  const title = `${list.title} — lista de @${username}`;
  const description = list.description || `Confira "${list.title}", uma lista de títulos no ShowRadar.`;

  return {
    title,
    description,
    alternates: { canonical: `/l/${username}/${slug}` },
    // unlisted: o link funciona pra quem já tem, mas não deve ser indexado
    // nem aparecer em busca — só "public" é de fato SEO-facing.
    robots: list.visibility === "unlisted" ? { index: false, follow: false } : undefined,
    openGraph: { type: "website", title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function PublicListPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const [row, session] = await Promise.all([getListForView(username, slug), auth()]);
  if (!row) notFound();

  const { list, owner } = row;
  const isOwner = session?.user?.id === owner.id;
  if (!isOwner && list.visibility === "private") notFound();

  const items = await getListItemsWithTitles(list.id);
  const listUrl = `${getSiteUrl()}/l/${username}/${slug}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Lista de <span className="font-medium text-foreground">@{owner.username}</span>
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{list.title}</h1>
        {list.description && <p className="max-w-2xl text-sm text-muted-foreground">{list.description}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <ShareListButton url={listUrl} title={list.title} />
        </div>
      </div>

      {isOwner && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
          <ListVisibilitySelect listId={list.id} initial={list.visibility} />
          {!list.isFavorites && <DeleteListButton listId={list.id} listTitle={list.title} redirectTo="/lists" />}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Nenhum título nessa lista ainda — adicione pela página de um título."
            : "Essa lista ainda não tem títulos."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <div key={item.titleId} className="group relative">
              <TitleCard
                href={`/title/${item.mediaType}/${item.tmdbId}`}
                posterPath={item.posterPath}
                name={item.name}
              />
              {isOwner && (
                <RemoveFromListButton
                  listId={list.id}
                  titleId={item.titleId}
                  mediaType={item.mediaType}
                  tmdbId={item.tmdbId}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
