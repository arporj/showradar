import { redirect } from "next/navigation";

// The user list now lives on /admin itself (the admin section's home tab) —
// this route only exists so old links/bookmarks to /admin/users still land
// somewhere sensible, filters and all, instead of 404ing.
export default async function AdminUsersRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined),
  ).toString();
  redirect(qs ? `/admin?${qs}` : "/admin");
}
