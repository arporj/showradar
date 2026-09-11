import { test, expect, type Page } from "@playwright/test";

import { closeDb, removeTitleFromLibrary } from "./db";

// Fixture data assumed present for the persistent QA account (see
// .claude/skills/verify/SKILL.md): a TV show at tmdb id 90228 with at least
// two episodes in season 1, another TV show at tmdb id 103540 with at least
// one season, and "Matrix Revolutions" searchable via /search.
const QA_USERNAME = "qa_persistent";
const TV_SHOW_TMDB_ID = 90228;
const TV_SHOW_WITH_SEASON_TMDB_ID = 103540;
// A movie dedicated to this one test - reset out of the library before and
// after (directly in the DB - see db.ts), so repeated runs always find it in
// a pristine "not added" state. Search result cards hide the quick-watch
// button entirely once a title is already in the library, in favor of a
// generic "Adicionado", so this state has to be genuinely clean going in.
const MOVIE_TMDB_ID = 605; // Matrix Revolutions (2003)
const MOVIE_TITLE = "Matrix Revolutions (2003)";
// The rating dialog's label is just the bare title (no year) - it reuses
// SearchResultCard's `title` variable, which drops the year suffix.
const MOVIE_NAME = "Matrix Revolutions";

test.afterAll(closeDb);

async function ensureEpisodeUnwatched(page: Page) {
  const toggle = page.getByRole("checkbox").first();
  if ((await toggle.getAttribute("aria-checked")) === "true") {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  }
  return toggle;
}

test.describe("rating prompt after marking watched", () => {
  test("marking an episode watched opens the rating dialog, and picking a star saves it", async ({ page }) => {
    await page.goto(`/title/tv/${TV_SHOW_TMDB_ID}/season/1/episode/1`);
    const toggle = await ensureEpisodeUnwatched(page);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("O que você achou?");

    // Half-star buttons are ordered low-to-high; index 7 is the 4th full star.
    await dialog.locator("button[aria-label*='estrela']").nth(7).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await expect(page.getByText("Sua avaliação")).toBeVisible();
  });

  test("canceling the dialog does not record a rating", async ({ page }) => {
    await page.goto(`/title/tv/${TV_SHOW_TMDB_ID}/season/1/episode/2`);
    const toggle = await ensureEpisodeUnwatched(page);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Agora não" }).click();
    await expect(dialog).toBeHidden();

    // The episode stays watched (canceling only skips the rating, not the
    // watch mark). RatingForm only renders a "Remover" button once a rating
    // is actually on record, so its absence confirms none was saved.
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await page.reload();
    const ratingBlock = page.locator("div", { has: page.getByText("Sua avaliação", { exact: true }) }).last();
    await expect(ratingBlock.getByRole("button", { name: "Remover" })).toHaveCount(0);
  });

  test("marking a movie watched from search opens the rating dialog and the rating persists", async ({ page }) => {
    await removeTitleFromLibrary(QA_USERNAME, MOVIE_TMDB_ID, "movie");

    await page.goto("/search?q=Matrix Revolutions");
    // Scope to this exact result card (SearchResultCard's own wrapper class)
    // so the button lookup can't match a sibling card for a different movie.
    const card = page.locator("div.rounded-lg.border.p-3", {
      has: page.getByRole("link", { name: MOVIE_TITLE, exact: true }),
    });
    await card.getByRole("button", { name: "Adicionar à grade e marcar como assistido" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(MOVIE_NAME);

    await dialog.locator("button[aria-label*='estrela']").nth(9).click(); // 5 stars
    await expect(dialog).toBeHidden();

    await card.getByRole("link", { name: MOVIE_TITLE, exact: true }).click();
    await page.waitForURL(`**/title/movie/${MOVIE_TMDB_ID}`);
    await expect(page.getByText("Sua avaliação")).toBeVisible();

    await removeTitleFromLibrary(QA_USERNAME, MOVIE_TMDB_ID, "movie");
  });

  test("marking a whole season watched does not open the rating dialog", async ({ page }) => {
    await page.goto(`/title/tv/${TV_SHOW_WITH_SEASON_TMDB_ID}`);

    const seasonToggle = page.getByRole("checkbox", { name: /temporada inteira/i }).first();
    await seasonToggle.click();

    // A season with earlier incomplete seasons prompts a "mark previous
    // seasons too?" AlertDialog first - answer it either way, it's a
    // separate, unrelated confirm flow.
    const bulkConfirm = page.getByRole("alertdialog");
    if (await bulkConfirm.isVisible().catch(() => false)) {
      await bulkConfirm.getByRole("button", { name: /Sim, marcar todos/i }).click();
    }

    await page.waitForTimeout(1000);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
