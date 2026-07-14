CREATE TABLE "showradar"."dismissed_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tmdb_id" integer NOT NULL,
	"media_type" "showradar"."media_type" NOT NULL,
	"dismissed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "showradar"."dismissed_recommendations" ADD CONSTRAINT "dismissed_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dismissed_recommendations_user_id_tmdb_id_media_type_idx" ON "showradar"."dismissed_recommendations" USING btree ("user_id","tmdb_id","media_type");