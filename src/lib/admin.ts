import { and, asc, desc, eq, gte, ilike, or, sql } from "drizzle-orm";

import { titles, userLibrary, users, type userPlanEnum } from "@/db/schema";
import { db } from "@/lib/db";
import { escapeLikePattern } from "@/lib/user-search";

export async function getAdminUserMetrics() {
  const [[{ totalUsers }], [{ activeUsers30d }], signupsByDay] = await Promise.all([
    db.select({ totalUsers: sql<number>`count(*)::int` }).from(users),
    db
      .select({ activeUsers30d: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.lastActiveAt, sql`now() - interval '30 days'`)),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${users.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(gte(users.createdAt, sql`now() - interval '30 days'`))
      .groupBy(sql`date_trunc('day', ${users.createdAt})`)
      .orderBy(sql`date_trunc('day', ${users.createdAt})`),
  ]);

  return {
    totalUsers,
    activeUsers30d,
    newSignups30d: signupsByDay.reduce((sum, day) => sum + day.count, 0),
  };
}

export async function getAdminTopTitles() {
  return db
    .select({
      titleId: userLibrary.titleId,
      name: titles.name,
      mediaType: titles.mediaType,
      count: sql<number>`count(*)::int`,
    })
    .from(userLibrary)
    .innerJoin(titles, eq(userLibrary.titleId, titles.id))
    .groupBy(userLibrary.titleId, titles.name, titles.mediaType)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
}

const PAGE_SIZE = 20;

export const ADMIN_USER_SORTS = ["cadastro", "acesso"] as const;
export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];
export type SortDirection = "asc" | "desc";

// Lê `?sort=` e `?dir=` da URL; qualquer valor fora da lista cai no padrão
// (cadastro mais recente primeiro).
export function parseAdminUserSort(sort?: string, dir?: string): { sort: AdminUserSort; dir: SortDirection } {
  return {
    sort: ADMIN_USER_SORTS.find((value) => value === sort) ?? "cadastro",
    dir: dir === "asc" ? "asc" : "desc",
  };
}

function adminUserOrderBy(sort: AdminUserSort, dir: SortDirection) {
  if (sort === "acesso") {
    // Quem nunca acessou conta como o acesso mais antigo: fim da lista em
    // "mais recente primeiro", início em "mais antigo primeiro".
    return dir === "desc"
      ? [sql`${users.lastActiveAt} desc nulls last`, asc(users.id)]
      : [sql`${users.lastActiveAt} asc nulls first`, asc(users.id)];
  }
  return [dir === "desc" ? desc(users.createdAt) : asc(users.createdAt), asc(users.id)];
}

export async function searchAdminUsers({
  query,
  plan,
  page,
  sort = "cadastro",
  dir = "desc",
}: {
  query?: string;
  plan?: (typeof userPlanEnum.enumValues)[number];
  page: number;
  sort?: AdminUserSort;
  dir?: SortDirection;
}) {
  const conditions = [];
  if (query) {
    const pattern = `%${escapeLikePattern(query)}%`;
    conditions.push(or(ilike(users.username, pattern), ilike(users.name, pattern), ilike(users.email, pattern)));
  }
  if (plan) conditions.push(eq(users.plan, plan));

  const rows = await db
    .select()
    .from(users)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...adminUserOrderBy(sort, dir))
    // Fetch one extra row as a cheap "is there a next page" peek.
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  return { users: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function getAdminUserDetail(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  const [{ libraryCount }] = await db
    .select({ libraryCount: sql<number>`count(*)::int` })
    .from(userLibrary)
    .where(eq(userLibrary.userId, userId));

  return { user, libraryCount };
}
