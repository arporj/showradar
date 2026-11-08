ALTER TABLE "showradar"."users" ADD COLUMN "last_active_at" timestamp;--> statement-breakpoint
CREATE INDEX "users_last_active_at_idx" ON "showradar"."users" USING btree ("last_active_at");--> statement-breakpoint
-- Estimativa para quem já tinha conta: o momento da ação mais recente que o
-- banco registrou (sempre created_at/updated_at da linha, nunca watched_at,
-- que pode ser uma data escolhida pela pessoa ou vinda de importação).
-- Quem nunca fez nada fica com a data do cadastro.
UPDATE "showradar"."users" u
SET "last_active_at" = GREATEST(u."created_at", a.last_at)
FROM (
  SELECT user_id, max(at) AS last_at
  FROM (
    SELECT "user_id", "created_at" AS at FROM "showradar"."episode_watch_events"
    UNION ALL SELECT "user_id", "created_at" FROM "showradar"."movie_watch_events"
    UNION ALL SELECT "user_id", "created_at" FROM "showradar"."user_episode_progress"
    UNION ALL SELECT "user_id", "updated_at" FROM "showradar"."user_library"
    UNION ALL SELECT "user_id", "updated_at" FROM "showradar"."episode_ratings"
    UNION ALL SELECT "user_id", "created_at" FROM "showradar"."episode_comments"
    UNION ALL SELECT "user_id", "created_at" FROM "showradar"."title_comments"
    UNION ALL SELECT "user_id", "created_at" FROM "showradar"."episode_comment_reactions"
    UNION ALL SELECT "user_id", "created_at" FROM "showradar"."title_comment_reactions"
    UNION ALL SELECT "user_id", "updated_at" FROM "showradar"."lists"
    UNION ALL SELECT "follower_id", "created_at" FROM "showradar"."follows"
    UNION ALL SELECT "user_id", "created_at" FROM "showradar"."import_jobs"
    UNION ALL SELECT "user_id", "last_seen_at" FROM "showradar"."push_subscriptions"
  ) atividade
  GROUP BY user_id
) a
WHERE a.user_id = u."id";--> statement-breakpoint
UPDATE "showradar"."users" SET "last_active_at" = "created_at" WHERE "last_active_at" IS NULL;
