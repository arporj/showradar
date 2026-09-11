import { readFileSync } from "node:fs";

import postgres from "postgres";

// Playwright's test runner doesn't load .env.local the way `next dev`/`next
// start` do - read it directly rather than adding a dotenv dependency just
// for this one value.
function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = readFileSync(".env.local", "utf-8");
  const match = envFile.match(/^DATABASE_URL=(.*)$/m);
  if (!match) throw new Error("DATABASE_URL not found in .env.local");
  return match[1].trim().replace(/^"(.*)"$/, "$1");
}

const sql = postgres(loadDatabaseUrl(), { max: 1 });

// Deletes straight from user_library instead of driving the "Remover" button
// through the UI - the UI path only flips the button optimistically, and the
// actual DELETE landing server-side isn't observable from the page itself,
// which made cleanup between test runs flaky.
export async function removeTitleFromLibrary(username: string, tmdbId: number, mediaType: "movie" | "tv") {
  await sql`
    delete from showradar.user_library
    where user_id = (select id from showradar.users where username = ${username})
      and title_id = (
        select id from showradar.titles where tmdb_id = ${tmdbId} and media_type = ${mediaType}
      )
  `;
}

export async function closeDb() {
  await sql.end();
}
