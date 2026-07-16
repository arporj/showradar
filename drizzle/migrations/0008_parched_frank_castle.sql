CREATE TABLE "showradar"."episode_comment_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showradar"."episode_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"body" text NOT NULL,
	"rating" smallint,
	"reply_to_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "showradar"."episode_comment_likes" ADD CONSTRAINT "episode_comment_likes_comment_id_episode_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "showradar"."episode_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."episode_comment_likes" ADD CONSTRAINT "episode_comment_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."episode_comments" ADD CONSTRAINT "episode_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."episode_comments" ADD CONSTRAINT "episode_comments_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "showradar"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."episode_comments" ADD CONSTRAINT "episode_comments_reply_to_id_episode_comments_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "showradar"."episode_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episode_comment_likes_comment_id_user_id_idx" ON "showradar"."episode_comment_likes" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "episode_comments_episode_id_created_at_idx" ON "showradar"."episode_comments" USING btree ("episode_id","created_at");