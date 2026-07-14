CREATE TYPE "showradar"."user_plan" AS ENUM('free', 'premium');--> statement-breakpoint
CREATE TYPE "showradar"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
ALTER TABLE "showradar"."users" ADD COLUMN "role" "showradar"."user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "showradar"."users" ADD COLUMN "plan" "showradar"."user_plan" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "showradar"."users" ADD COLUMN "is_suspended" boolean DEFAULT false NOT NULL;