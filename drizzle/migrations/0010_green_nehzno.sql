CREATE TYPE "showradar"."comment_reaction_type" AS ENUM('like', 'dislike');--> statement-breakpoint
ALTER TYPE "showradar"."notification_type" ADD VALUE 'mention';--> statement-breakpoint
ALTER TYPE "showradar"."notification_type" ADD VALUE 'reply';--> statement-breakpoint
ALTER TYPE "showradar"."notification_type" ADD VALUE 'reaction';--> statement-breakpoint
CREATE TABLE "showradar"."episode_comment_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "showradar"."comment_reaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showradar"."title_comment_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "showradar"."comment_reaction_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showradar"."title_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"body" text NOT NULL,
	"reply_to_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "showradar"."notification_preferences" ADD COLUMN "notify_mentions" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "showradar"."notification_preferences" ADD COLUMN "notify_replies" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "showradar"."notification_preferences" ADD COLUMN "notify_reactions" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "showradar"."episode_comment_reactions" ADD CONSTRAINT "episode_comment_reactions_comment_id_episode_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "showradar"."episode_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."episode_comment_reactions" ADD CONSTRAINT "episode_comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."title_comment_reactions" ADD CONSTRAINT "title_comment_reactions_comment_id_title_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "showradar"."title_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."title_comment_reactions" ADD CONSTRAINT "title_comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."title_comments" ADD CONSTRAINT "title_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."title_comments" ADD CONSTRAINT "title_comments_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "showradar"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."title_comments" ADD CONSTRAINT "title_comments_reply_to_id_title_comments_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "showradar"."title_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episode_comment_reactions_comment_id_user_id_idx" ON "showradar"."episode_comment_reactions" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "title_comment_reactions_comment_id_user_id_idx" ON "showradar"."title_comment_reactions" USING btree ("comment_id","user_id");--> statement-breakpoint
CREATE INDEX "title_comments_title_id_created_at_idx" ON "showradar"."title_comments" USING btree ("title_id","created_at");--> statement-breakpoint
ALTER TABLE "showradar"."user_library" DROP COLUMN "review_text";