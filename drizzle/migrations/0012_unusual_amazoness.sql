ALTER TYPE "showradar"."library_status" ADD VALUE 'on_hold';--> statement-breakpoint
CREATE TABLE "showradar"."episode_watch_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"watched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showradar"."movie_watch_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"watched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "showradar"."episode_watch_events" ADD CONSTRAINT "episode_watch_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."episode_watch_events" ADD CONSTRAINT "episode_watch_events_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "showradar"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."movie_watch_events" ADD CONSTRAINT "movie_watch_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."movie_watch_events" ADD CONSTRAINT "movie_watch_events_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "showradar"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "episode_watch_events_user_id_episode_id_idx" ON "showradar"."episode_watch_events" USING btree ("user_id","episode_id");--> statement-breakpoint
CREATE INDEX "episode_watch_events_user_id_watched_at_idx" ON "showradar"."episode_watch_events" USING btree ("user_id","watched_at");--> statement-breakpoint
CREATE INDEX "movie_watch_events_user_id_title_id_idx" ON "showradar"."movie_watch_events" USING btree ("user_id","title_id");--> statement-breakpoint
CREATE INDEX "movie_watch_events_user_id_watched_at_idx" ON "showradar"."movie_watch_events" USING btree ("user_id","watched_at");