CREATE TABLE "showradar"."episode_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "showradar"."episode_ratings" ADD CONSTRAINT "episode_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."episode_ratings" ADD CONSTRAINT "episode_ratings_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "showradar"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episode_ratings_user_id_episode_id_idx" ON "showradar"."episode_ratings" USING btree ("user_id","episode_id");--> statement-breakpoint
ALTER TABLE "showradar"."episode_comments" DROP COLUMN "rating";