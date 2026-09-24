import Link from "next/link";

import { FriendActivityRow } from "@/components/social/friend-activity-row";
import { PeopleTab } from "@/components/social/people-tab";
import { RankingRow } from "@/components/social/ranking-row";
import { SocialActivityRow } from "@/components/social/social-activity-row";
import { auth } from "@/lib/auth";
import { getFriendActivity } from "@/lib/feed";
import {
  getSocialActivity,
  getSocialRanking,
  isRankingSort,
  isRankingType,
  RANKING_SORTS,
  RANKING_TYPES,
  SOCIAL_PAGE_SIZE,
  type RankingSort,
  type RankingType,
} from "@/lib/social";
import { cn } from "@/lib/utils";

type SocialTab = "ranking" | "recentes" | "amigos" | "pessoas";

const TABS: { value: SocialTab; label: string }[] = [
  { value: "ranking", label: "Ranking" },
  { value: "recentes", label: "Recentes" },
  { value: "amigos", label: "Amigos" },
  { value: "pessoas", label: "Pessoas" },
];

function isSocialTab(value: unknown): value is SocialTab {
  return TABS.some((tab) => tab.value === value);
}

function socialHref(params: { tab: SocialTab; type?: RankingType; sort?: RankingSort; page?: number }) {
  const search = new URLSearchParams();
  if (params.tab !== "ranking") search.set("tab", params.tab);
  if (params.type && params.type !== "all") search.set("type", params.type);
  if (params.sort && params.sort !== "best") search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/social?${query}` : "/social";
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function Pagination({ page, hasMore, hrefFor }: { page: number; hasMore: boolean; hrefFor: (page: number) => string }) {
  if (page <= 1 && !hasMore) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="underline-offset-4 hover:underline">
          ← Anteriores
        </Link>
      ) : (
        <span />
      )}
      {hasMore && (
        <Link href={hrefFor(page + 1)} className="underline-offset-4 hover:underline">
          Próximos →
        </Link>
      )}
    </div>
  );
}

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; type?: string; sort?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const tab: SocialTab = isSocialTab(params.tab) ? params.tab : "ranking";
  const type: RankingType = isRankingType(params.type) ? params.type : "all";
  const sort: RankingSort = isRankingSort(params.sort) ? params.sort : "best";
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Social</h1>
        <p className="text-muted-foreground">O que a comunidade do ShowRadar está avaliando e comentando.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto border-b">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={socialHref({ tab: item.value })}
            className={cn(
              "shrink-0 border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
              tab === item.value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "ranking" && <RankingTab type={type} sort={sort} page={page} />}
      {tab === "recentes" && <RecentTab viewerId={session.user.id} page={page} />}
      {tab === "amigos" && <FriendsTab userId={session.user.id} />}
      {tab === "pessoas" && <PeopleTab />}
    </div>
  );
}

async function RankingTab({ type, sort, page }: { type: RankingType; sort: RankingSort; page: number }) {
  const { items, hasMore } = await getSocialRanking({ type, sort, page });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {RANKING_TYPES.map((filter) => (
          <FilterChip key={filter.value} href={socialHref({ tab: "ranking", type: filter.value, sort })} active={type === filter.value}>
            {filter.label}
          </FilterChip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {RANKING_SORTS.map((option) => (
          <FilterChip key={option.value} href={socialHref({ tab: "ranking", type, sort: option.value })} active={sort === option.value}>
            {option.label}
          </FilterChip>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {page > 1 ? "Não há mais itens." : "Nenhum título avaliado por aqui ainda."}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <RankingRow key={item.key} item={item} position={(page - 1) * SOCIAL_PAGE_SIZE + index + 1} />
          ))}
        </div>
      )}

      <Pagination page={page} hasMore={hasMore} hrefFor={(p) => socialHref({ tab: "ranking", type, sort, page: p })} />
    </div>
  );
}

async function RecentTab({ viewerId, page }: { viewerId: string; page: number }) {
  const { items, hasMore } = await getSocialActivity({ viewerId, page });

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {page > 1 ? "Não há mais itens." : "Ninguém comentou ou avaliou nada ainda."}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <SocialActivityRow key={item.key} item={item} />
          ))}
        </div>
      )}

      <Pagination page={page} hasMore={hasMore} hrefFor={(p) => socialHref({ tab: "recentes", page: p })} />
    </div>
  );
}

// O antigo /feed ("Atividade") inteiro, sem mudança de comportamento.
async function FriendsTab({ userId }: { userId: string }) {
  const activity = await getFriendActivity(userId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">O que as pessoas que você segue andaram assistindo.</p>
      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguém que você segue teve atividade ainda.{" "}
          <Link href={socialHref({ tab: "pessoas" })} className="underline underline-offset-4">
            Encontre pessoas para seguir
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-3">
          {activity.map((item) => (
            <FriendActivityRow key={item.key} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
