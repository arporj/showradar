import { sql, type SQL } from "drizzle-orm";

import {
  episodeComments,
  episodeRatings,
  episodes,
  follows,
  seasons,
  titleComments,
  titles,
  userLibrary,
  users,
} from "@/db/schema";
import { db } from "@/lib/db";
import { shiftDateString, todayBrDateString } from "@/lib/release-dates";
import type { TmdbMediaType } from "@/lib/tmdb";

// Mesma janela das prévias de comentário nas páginas de título e episódio
// (SPOILER_PREVIEW_WINDOW_DAYS lá) — um comentário recém-postado sobre algo
// que acabou de estrear chega borrado aqui também, não só na página dele.
const SPOILER_PREVIEW_WINDOW_DAYS = 2;

export const SOCIAL_PAGE_SIZE = 30;

export type RankingType = "all" | "movie" | "tv" | "episode";
export type RankingSort = "best" | "worst" | "most_comments" | "least_comments";

export const RANKING_TYPES: { value: RankingType; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "movie", label: "Filmes" },
  { value: "tv", label: "Séries" },
  { value: "episode", label: "Episódios" },
];

export const RANKING_SORTS: { value: RankingSort; label: string }[] = [
  { value: "best", label: "Melhor nota" },
  { value: "worst", label: "Pior nota" },
  { value: "most_comments", label: "Mais comentados" },
  { value: "least_comments", label: "Menos comentados" },
];

export function isRankingType(value: unknown): value is RankingType {
  return RANKING_TYPES.some((t) => t.value === value);
}

export function isRankingSort(value: unknown): value is RankingSort {
  return RANKING_SORTS.some((s) => s.value === value);
}

// Whitelist fixa — o valor vem da URL, então nunca é interpolado cru.
// Desempate por quantidade de votos: com pouca avaliação no sistema, um
// título com uma única nota máxima não deve ficar à frente de um com dez
// notas quase máximas só por empate de ordenação.
const RANKING_ORDER: Record<RankingSort, SQL> = {
  best: sql.raw("average desc, rating_count desc, comment_count desc, name asc, item_id asc"),
  worst: sql.raw("average asc, rating_count desc, comment_count desc, name asc, item_id asc"),
  most_comments: sql.raw("comment_count desc, rating_count desc, average desc, name asc, item_id asc"),
  least_comments: sql.raw("comment_count asc, rating_count desc, average desc, name asc, item_id asc"),
};

export interface RankingItem {
  key: string;
  kind: "title" | "episode";
  tmdbId: number;
  mediaType: TmdbMediaType;
  name: string;
  posterPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeName: string | null;
  // Média na escala armazenada (1-10, 2 pontos por estrela).
  average: number;
  ratingCount: number;
  commentCount: number;
  href: string;
  commentsHref: string;
}

interface RankingRow extends Record<string, unknown> {
  kind: "title" | "episode";
  item_id: string;
  tmdb_id: number;
  media_type: TmdbMediaType;
  name: string;
  poster_path: string | null;
  season_number: number | null;
  episode_number: number | null;
  episode_name: string | null;
  average: number;
  rating_count: number;
  comment_count: number;
}

function titleHref(mediaType: TmdbMediaType, tmdbId: number, seasonNumber: number | null, episodeNumber: number | null) {
  const base = `/title/${mediaType}/${tmdbId}`;
  return seasonNumber != null && episodeNumber != null ? `${base}/season/${seasonNumber}/episode/${episodeNumber}` : base;
}

/**
 * Filmes, séries e episódios que já receberam ao menos uma nota, com a média
 * e a contagem de votos de todos os usuários (mesmo agregado público que a
 * página do título já mostra — nenhuma nota individual sai daqui) e o total
 * de comentários. Itens sem nenhuma nota ficam de fora por decisão de
 * produto, mesmo que tenham comentários.
 */
export async function getSocialRanking({
  type,
  sort,
  page,
}: {
  type: RankingType;
  sort: RankingSort;
  page: number;
}): Promise<{ items: RankingItem[]; hasMore: boolean }> {
  const titleItems = sql`
    select
      'title' as kind,
      ${titles.id} as item_id,
      ${titles.tmdbId} as tmdb_id,
      ${titles.mediaType}::text as media_type,
      ${titles.name} as name,
      ${titles.posterPath} as poster_path,
      null::int as season_number,
      null::int as episode_number,
      null::text as episode_name,
      avg(${userLibrary.personalRating})::float8 as average,
      count(*)::int as rating_count,
      (select count(*)::int from ${titleComments} where ${titleComments.titleId} = ${titles.id}) as comment_count
    from ${userLibrary}
    inner join ${titles} on ${titles.id} = ${userLibrary.titleId}
    where ${userLibrary.personalRating} is not null
      ${type === "movie" || type === "tv" ? sql`and ${titles.mediaType}::text = ${type}` : sql``}
    group by ${titles.id}`;

  const episodeItems = sql`
    select
      'episode' as kind,
      ${episodes.id} as item_id,
      ${titles.tmdbId} as tmdb_id,
      ${titles.mediaType}::text as media_type,
      ${titles.name} as name,
      ${titles.posterPath} as poster_path,
      ${seasons.seasonNumber} as season_number,
      ${episodes.episodeNumber} as episode_number,
      ${episodes.name} as episode_name,
      avg(${episodeRatings.rating})::float8 as average,
      count(*)::int as rating_count,
      (select count(*)::int from ${episodeComments} where ${episodeComments.episodeId} = ${episodes.id}) as comment_count
    from ${episodeRatings}
    inner join ${episodes} on ${episodes.id} = ${episodeRatings.episodeId}
    inner join ${seasons} on ${seasons.id} = ${episodes.seasonId}
    inner join ${titles} on ${titles.id} = ${episodes.titleId}
    group by ${episodes.id}, ${seasons.id}, ${titles.id}`;

  const sources =
    type === "episode" ? episodeItems : type === "all" ? sql`${titleItems} union all ${episodeItems}` : titleItems;

  const rows = await db.execute<RankingRow>(sql`
    select * from (${sources}) as ranking
    order by ${RANKING_ORDER[sort]}
    limit ${SOCIAL_PAGE_SIZE + 1}
    offset ${(page - 1) * SOCIAL_PAGE_SIZE}`);

  const items = [...rows].slice(0, SOCIAL_PAGE_SIZE).map((row) => {
    const href = titleHref(row.media_type, row.tmdb_id, row.season_number, row.episode_number);
    return {
      key: `${row.kind}-${row.item_id}`,
      kind: row.kind,
      tmdbId: row.tmdb_id,
      mediaType: row.media_type,
      name: row.name,
      posterPath: row.poster_path,
      seasonNumber: row.season_number,
      episodeNumber: row.episode_number,
      episodeName: row.episode_name,
      average: row.average,
      ratingCount: row.rating_count,
      commentCount: row.comment_count,
      href,
      commentsHref: `${href}/comments`,
    };
  });

  return { items, hasMore: rows.length > SOCIAL_PAGE_SIZE };
}

export interface SocialActivityItem {
  key: string;
  kind: "comment" | "rating";
  at: Date;
  user: { id: string; username: string | null; name: string | null; avatarUrl: string | null };
  tmdbId: number;
  mediaType: TmdbMediaType;
  name: string;
  posterPath: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeName: string | null;
  body: string | null;
  isReply: boolean;
  rating: number | null;
  spoilerBlurred: boolean;
  href: string;
  commentsHref: string;
}

interface ActivityRow extends Record<string, unknown> {
  kind: "comment" | "rating";
  item_id: string;
  at_ms: number;
  user_id: string;
  username: string | null;
  user_name: string | null;
  avatar_url: string | null;
  tmdb_id: number;
  media_type: TmdbMediaType;
  name: string;
  poster_path: string | null;
  season_number: number | null;
  episode_number: number | null;
  episode_name: string | null;
  body: string | null;
  is_reply: boolean;
  rating: number | null;
  spoiler_anchor: string | null;
}

/**
 * Linha do tempo de comentários e notas individuais, do mais recente pro
 * mais antigo. Comentários aparecem de todo mundo (já são públicos na página
 * do título); a nota individual de um perfil fechado só aparece para quem o
 * segue com pedido aceito — mesma regra que libera a grade no perfil
 * (user/[username]/page.tsx). `authorId` restringe a uma pessoa só (página
 * "Notas e comentários" do perfil).
 */
export async function getSocialActivity({
  viewerId,
  authorId,
  page,
}: {
  viewerId: string;
  authorId?: string;
  page: number;
}): Promise<{ items: SocialActivityItem[]; hasMore: boolean }> {
  const ratingVisible = sql`(
    ${users.isPrivate} = false
    or ${users.id} = ${viewerId}
    or exists (
      select 1 from ${follows}
      where ${follows.followerId} = ${viewerId}
        and ${follows.followingId} = ${users.id}
        and ${follows.status} = 'accepted'
    )
  )`;
  const authorFilter = authorId ? sql`and ${users.id} = ${authorId}` : sql``;

  const userColumns = sql`
    ${users.id} as user_id,
    ${users.username} as username,
    ${users.name} as user_name,
    coalesce(${users.avatarUrl}, ${users.image}) as avatar_url`;
  const titleColumns = sql`
    ${titles.tmdbId} as tmdb_id,
    ${titles.mediaType}::text as media_type,
    ${titles.name} as name,
    ${titles.posterPath} as poster_path`;
  const noEpisodeColumns = sql`null::int as season_number, null::int as episode_number, null::text as episode_name`;
  const episodeColumns = sql`
    ${seasons.seasonNumber} as season_number,
    ${episodes.episodeNumber} as episode_number,
    ${episodes.name} as episode_name`;
  // Mesma âncora de spoiler que a página do título usa: estreia do filme,
  // ou o último episódio exibido no caso de série.
  const titleSpoilerAnchor = sql`(case when ${titles.mediaType} = 'movie' then ${titles.releaseDate}::text else ${titles.lastEpisodeToAir}->>'air_date' end)`;

  const rows = await db.execute<ActivityRow>(sql`
    select * from (
      select
        'comment' as kind, ${titleComments.id} as item_id,
        (extract(epoch from ${titleComments.createdAt}) * 1000)::float8 as at_ms,
        ${userColumns}, ${titleColumns}, ${noEpisodeColumns},
        ${titleComments.body} as body,
        (${titleComments.replyToId} is not null) as is_reply,
        null::int as rating,
        ${titleSpoilerAnchor} as spoiler_anchor
      from ${titleComments}
      inner join ${users} on ${users.id} = ${titleComments.userId}
      inner join ${titles} on ${titles.id} = ${titleComments.titleId}
      where true ${authorFilter}

      union all

      select
        'comment' as kind, ${episodeComments.id} as item_id,
        (extract(epoch from ${episodeComments.createdAt}) * 1000)::float8 as at_ms,
        ${userColumns}, ${titleColumns}, ${episodeColumns},
        ${episodeComments.body} as body,
        (${episodeComments.replyToId} is not null) as is_reply,
        null::int as rating,
        ${episodes.airDate}::text as spoiler_anchor
      from ${episodeComments}
      inner join ${users} on ${users.id} = ${episodeComments.userId}
      inner join ${episodes} on ${episodes.id} = ${episodeComments.episodeId}
      inner join ${seasons} on ${seasons.id} = ${episodes.seasonId}
      inner join ${titles} on ${titles.id} = ${episodes.titleId}
      where true ${authorFilter}

      union all

      select
        'rating' as kind, ${userLibrary.id} as item_id,
        (extract(epoch from ${userLibrary.reviewUpdatedAt}) * 1000)::float8 as at_ms,
        ${userColumns}, ${titleColumns}, ${noEpisodeColumns},
        null::text as body,
        false as is_reply,
        ${userLibrary.personalRating}::int as rating,
        null::text as spoiler_anchor
      from ${userLibrary}
      inner join ${users} on ${users.id} = ${userLibrary.userId}
      inner join ${titles} on ${titles.id} = ${userLibrary.titleId}
      where ${userLibrary.personalRating} is not null
        and ${userLibrary.reviewUpdatedAt} is not null
        and ${ratingVisible} ${authorFilter}

      union all

      select
        'rating' as kind, ${episodeRatings.id} as item_id,
        (extract(epoch from ${episodeRatings.updatedAt}) * 1000)::float8 as at_ms,
        ${userColumns}, ${titleColumns}, ${episodeColumns},
        null::text as body,
        false as is_reply,
        ${episodeRatings.rating}::int as rating,
        null::text as spoiler_anchor
      from ${episodeRatings}
      inner join ${users} on ${users.id} = ${episodeRatings.userId}
      inner join ${episodes} on ${episodes.id} = ${episodeRatings.episodeId}
      inner join ${seasons} on ${seasons.id} = ${episodes.seasonId}
      inner join ${titles} on ${titles.id} = ${episodes.titleId}
      where ${ratingVisible} ${authorFilter}
    ) as activity
    order by at_ms desc, item_id asc
    limit ${SOCIAL_PAGE_SIZE + 1}
    offset ${(page - 1) * SOCIAL_PAGE_SIZE}`);

  const today = todayBrDateString();

  const items = [...rows].slice(0, SOCIAL_PAGE_SIZE).map((row) => {
    const href = titleHref(row.media_type, row.tmdb_id, row.season_number, row.episode_number);
    const spoilerCutoff = row.spoiler_anchor ? shiftDateString(row.spoiler_anchor, SPOILER_PREVIEW_WINDOW_DAYS) : null;
    return {
      key: `${row.kind}-${row.season_number != null ? "episode" : "title"}-${row.item_id}`,
      kind: row.kind,
      at: new Date(row.at_ms),
      user: { id: row.user_id, username: row.username, name: row.user_name, avatarUrl: row.avatar_url },
      tmdbId: row.tmdb_id,
      mediaType: row.media_type,
      name: row.name,
      posterPath: row.poster_path,
      seasonNumber: row.season_number,
      episodeNumber: row.episode_number,
      episodeName: row.episode_name,
      body: row.body,
      isReply: row.is_reply,
      rating: row.rating,
      spoilerBlurred: row.kind === "comment" && spoilerCutoff != null && today < spoilerCutoff,
      href,
      commentsHref: `${href}/comments`,
    };
  });

  return { items, hasMore: rows.length > SOCIAL_PAGE_SIZE };
}
