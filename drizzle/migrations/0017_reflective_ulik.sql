ALTER TYPE "showradar"."notification_type" ADD VALUE 'follow_request';--> statement-breakpoint
ALTER TYPE "showradar"."notification_type" ADD VALUE 'follow_accepted';--> statement-breakpoint
ALTER TABLE "showradar"."notification_preferences" ADD COLUMN "notify_follow_request" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "showradar"."notification_preferences" ADD COLUMN "notify_follow_accepted" boolean DEFAULT true NOT NULL;