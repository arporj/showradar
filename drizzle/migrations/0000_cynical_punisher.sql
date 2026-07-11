CREATE SCHEMA "showradar";
--> statement-breakpoint
CREATE TYPE "showradar"."avatar_source" AS ENUM('default', 'upload', 'oauth');--> statement-breakpoint
CREATE TYPE "showradar"."library_status" AS ENUM('plan_to_watch', 'watching', 'completed', 'dropped');--> statement-breakpoint
CREATE TYPE "showradar"."media_type" AS ENUM('movie', 'tv');--> statement-breakpoint
CREATE TYPE "showradar"."notification_channel" AS ENUM('email', 'push');--> statement-breakpoint
CREATE TYPE "showradar"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "showradar"."notification_type" AS ENUM('new_episode', 'new_season', 'new_movie_release');--> statement-breakpoint
CREATE TABLE "showradar"."accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "showradar"."episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"episode_number" integer NOT NULL,
	"name" text,
	"overview" text,
	"air_date" date,
	"runtime" integer,
	"still_path" text,
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "showradar"."notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid,
	"episode_id" uuid,
	"season_id" uuid,
	"channel" "showradar"."notification_channel" NOT NULL,
	"notification_type" "showradar"."notification_type" NOT NULL,
	"status" "showradar"."notification_status" DEFAULT 'pending' NOT NULL,
	"dedup_key" text NOT NULL,
	"sent_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_log_dedup_key_unique" UNIQUE("dedup_key")
);
--> statement-breakpoint
CREATE TABLE "showradar"."notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"notify_new_episode" boolean DEFAULT true NOT NULL,
	"notify_new_season" boolean DEFAULT true NOT NULL,
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"timezone" text DEFAULT 'UTC' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showradar"."password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "showradar"."push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"platform" text DEFAULT 'web' NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "showradar"."seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"season_number" integer NOT NULL,
	"name" text,
	"overview" text,
	"air_date" date,
	"poster_path" text,
	"episode_count" integer,
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "showradar"."titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tmdb_id" integer NOT NULL,
	"media_type" "showradar"."media_type" NOT NULL,
	"name" text NOT NULL,
	"overview" text,
	"poster_path" text,
	"backdrop_path" text,
	"release_date" date,
	"first_air_date" date,
	"runtime" integer,
	"episode_run_time" integer[],
	"genres" jsonb,
	"credits" jsonb,
	"vote_average" numeric(3, 1),
	"popularity" numeric,
	"status" text,
	"in_production" boolean,
	"origin_country" text[],
	"next_episode_to_air" jsonb,
	"last_episode_to_air" jsonb,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showradar"."user_episode_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"watched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showradar"."user_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"status" "showradar"."library_status" DEFAULT 'plan_to_watch' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"personal_rating" smallint,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"watched_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "showradar"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"avatar_url" text,
	"avatar_source" "showradar"."avatar_source" DEFAULT 'default' NOT NULL,
	"password_hash" text,
	"session_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "showradar"."accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "showradar"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."episodes" ADD CONSTRAINT "episodes_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "showradar"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."notification_log" ADD CONSTRAINT "notification_log_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "showradar"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."notification_log" ADD CONSTRAINT "notification_log_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "showradar"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."notification_log" ADD CONSTRAINT "notification_log_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "showradar"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."seasons" ADD CONSTRAINT "seasons_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "showradar"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."user_episode_progress" ADD CONSTRAINT "user_episode_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."user_episode_progress" ADD CONSTRAINT "user_episode_progress_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "showradar"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."user_library" ADD CONSTRAINT "user_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "showradar"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "showradar"."user_library" ADD CONSTRAINT "user_library_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "showradar"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_season_id_episode_number_idx" ON "showradar"."episodes" USING btree ("season_id","episode_number");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_title_id_season_number_idx" ON "showradar"."seasons" USING btree ("title_id","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "titles_tmdb_id_media_type_idx" ON "showradar"."titles" USING btree ("tmdb_id","media_type");--> statement-breakpoint
CREATE UNIQUE INDEX "user_episode_progress_user_id_episode_id_idx" ON "showradar"."user_episode_progress" USING btree ("user_id","episode_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_library_user_id_title_id_idx" ON "showradar"."user_library" USING btree ("user_id","title_id");