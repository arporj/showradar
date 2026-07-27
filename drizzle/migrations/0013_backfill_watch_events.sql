-- Backfill the new append-only watch-event tables from existing state, so
-- lib/stats.ts (which switches to reading these tables) doesn't lose any
-- history that predates this migration.
INSERT INTO "showradar"."episode_watch_events" (user_id, episode_id, watched_at)
SELECT user_id, episode_id, watched_at FROM "showradar"."user_episode_progress";

INSERT INTO "showradar"."movie_watch_events" (user_id, title_id, watched_at)
SELECT user_id, title_id, watched_at FROM "showradar"."user_library"
WHERE status = 'completed' AND watched_at IS NOT NULL;