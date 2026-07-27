CREATE TYPE "showradar"."list_visibility" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
CREATE TABLE "showradar"."list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showradar"."lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"visibility" "showradar"."list_visibility" DEFAULT 'private' NOT NULL,
	"is_favorites" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "showradar"."list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "showradar"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."list_items" ADD CONSTRAINT "list_items_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "showradar"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."lists" ADD CONSTRAINT "lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "list_items_list_id_title_id_idx" ON "showradar"."list_items" USING btree ("list_id","title_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lists_user_id_slug_idx" ON "showradar"."lists" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "lists_user_id_favorites_idx" ON "showradar"."lists" USING btree ("user_id") WHERE "showradar"."lists"."is_favorites" = true;--> statement-breakpoint
-- Backfill: turn any existing user_library.is_favorite=true rows (never had
-- a UI to set them, but treated as real data if present) into membership in
-- each user's Favoritos list — created here only for users who actually had
-- a favorite; everyone else still gets it lazily on first favorite from now on.
INSERT INTO "showradar"."lists" (user_id, slug, title, visibility, is_favorites)
SELECT DISTINCT user_id, 'favoritos', 'Favoritos', 'private'::"showradar"."list_visibility", true
FROM "showradar"."user_library"
WHERE is_favorite = true;--> statement-breakpoint
INSERT INTO "showradar"."list_items" (list_id, title_id)
SELECT l.id, ul.title_id
FROM "showradar"."user_library" ul
JOIN "showradar"."lists" l ON l.user_id = ul.user_id AND l.is_favorites = true
WHERE ul.is_favorite = true;--> statement-breakpoint
ALTER TABLE "showradar"."user_library" DROP COLUMN "is_favorite";