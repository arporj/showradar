CREATE TYPE "showradar"."import_item_status" AS ENUM('pending', 'processing', 'matched', 'unmatched', 'error');--> statement-breakpoint
CREATE TYPE "showradar"."import_job_status" AS ENUM('processing', 'completed', 'completed_with_errors', 'failed');--> statement-breakpoint
CREATE TYPE "showradar"."import_source" AS ENUM('tv_time');--> statement-breakpoint
CREATE TABLE "showradar"."import_job_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"raw_title" text NOT NULL,
	"canonical_key" text NOT NULL,
	"media_type" "showradar"."media_type" NOT NULL,
	"year_hint" integer,
	"episodes_json" jsonb,
	"movie_watched_at" timestamp,
	"status" "showradar"."import_item_status" DEFAULT 'pending' NOT NULL,
	"tmdb_id" integer,
	"title_id" uuid,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "showradar"."import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" "showradar"."import_source" DEFAULT 'tv_time' NOT NULL,
	"status" "showradar"."import_job_status" DEFAULT 'processing' NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"processed_items" integer DEFAULT 0 NOT NULL,
	"matched_items" integer DEFAULT 0 NOT NULL,
	"unmatched_items" integer DEFAULT 0 NOT NULL,
	"error_items" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "showradar"."import_job_items" ADD CONSTRAINT "import_job_items_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "showradar"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."import_job_items" ADD CONSTRAINT "import_job_items_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "showradar"."titles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."import_jobs" ADD CONSTRAINT "import_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "import_job_items_job_id_canonical_key_media_type_idx" ON "showradar"."import_job_items" USING btree ("job_id","canonical_key","media_type");--> statement-breakpoint
CREATE INDEX "import_job_items_job_id_status_idx" ON "showradar"."import_job_items" USING btree ("job_id","status");