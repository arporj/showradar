import { eq, inArray, sql } from "drizzle-orm";

import { notificationLog, notificationPreferences, pushSubscriptions, users } from "@/db/schema";
import { db } from "@/lib/db";
import { notificationEmailHtml, sendEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";
import { isWithinQuietHours } from "@/lib/quiet-hours";

type CommentNotificationType = "mention" | "reply" | "reaction";

const MENTION_PATTERN = /@([a-z0-9_]+)/g;

// Resolves every "@username" in a comment body to a real user — the
// autocomplete in comment-composer.tsx only ever offers friends, but a
// hand-typed mention of any real username still counts and still notifies.
export async function resolveMentions(body: string): Promise<{ id: string; username: string | null }[]> {
  const usernames = [...new Set([...body.matchAll(MENTION_PATTERN)].map((m) => m[1]))];
  if (usernames.length === 0) return [];

  return db.select({ id: users.id, username: users.username }).from(users).where(inArray(users.username, usernames));
}

// Real-time counterpart to the daily cron in check-new-releases/route.ts —
// same dedup-log/quiet-hours/dead-subscription-cleanup pattern, but for a
// single recipient fired synchronously from a comment/reaction Server
// Action instead of batched once a day. Never throws — a notification
// failure must not fail the mutation that triggered it (same spirit as
// lib/actions/password-reset.ts's email send).
export async function notifyCommentEvent(input: {
  recipientUserId: string;
  actorUserId: string;
  type: CommentNotificationType;
  title: string;
  body: string;
  url: string;
  titleId?: string;
  episodeId?: string;
  dedupSuffix: string;
}) {
  if (input.recipientUserId === input.actorUserId) return;

  try {
    // Left join, not inner: notification_preferences is only created lazily
    // (first push subscribe / settings save), so a user who never touched
    // notification settings has no row yet — the schema's own column
    // defaults (all true) are what "notify by default" means, and an inner
    // join here would silently skip every such user.
    const [recipient] = await db
      .select({
        email: users.email,
        pushEnabled: sql<boolean>`coalesce(${notificationPreferences.pushEnabled}, true)`,
        emailEnabled: sql<boolean>`coalesce(${notificationPreferences.emailEnabled}, true)`,
        notifyMentions: sql<boolean>`coalesce(${notificationPreferences.notifyMentions}, true)`,
        notifyReplies: sql<boolean>`coalesce(${notificationPreferences.notifyReplies}, true)`,
        notifyReactions: sql<boolean>`coalesce(${notificationPreferences.notifyReactions}, true)`,
        quietHoursStart: notificationPreferences.quietHoursStart,
        quietHoursEnd: notificationPreferences.quietHoursEnd,
        timezone: sql<string>`coalesce(${notificationPreferences.timezone}, 'UTC')`,
      })
      .from(users)
      .leftJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
      .where(eq(users.id, input.recipientUserId));
    if (!recipient) return;

    const typeEnabled =
      input.type === "mention"
        ? recipient.notifyMentions
        : input.type === "reply"
          ? recipient.notifyReplies
          : recipient.notifyReactions;
    if (!typeEnabled) return;

    if (isWithinQuietHours(new Date(), recipient.timezone, recipient.quietHoursStart, recipient.quietHoursEnd)) {
      return;
    }

    const { title, body, url } = input;
    const logBase = {
      userId: input.recipientUserId,
      titleId: input.titleId,
      episodeId: input.episodeId,
      notificationType: input.type,
    };

    if (recipient.pushEnabled) {
      const dedupKey = `push:${input.recipientUserId}:${input.type}:${input.dedupSuffix}`;
      const [existing] = await db
        .select({ id: notificationLog.id })
        .from(notificationLog)
        .where(eq(notificationLog.dedupKey, dedupKey));

      if (!existing) {
        const subscriptions = await db
          .select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, input.recipientUserId));

        let anySent = false;
        for (const subscription of subscriptions) {
          const result = await sendPushNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            { title, body, url },
          );
          if (result.ok) anySent = true;
          else if (result.expired) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
        }

        if (subscriptions.length > 0) {
          await db
            .insert(notificationLog)
            .values({
              ...logBase,
              channel: "push",
              status: anySent ? "sent" : "failed",
              dedupKey,
              sentAt: anySent ? new Date() : null,
            })
            .onConflictDoNothing({ target: [notificationLog.dedupKey] });
        }
      }
    }

    if (recipient.emailEnabled) {
      const dedupKey = `email:${input.recipientUserId}:${input.type}:${input.dedupSuffix}`;
      const [existing] = await db
        .select({ id: notificationLog.id })
        .from(notificationLog)
        .where(eq(notificationLog.dedupKey, dedupKey));
      if (existing) return;

      let emailSent = false;
      try {
        await sendEmail({ to: recipient.email, subject: title, htmlContent: notificationEmailHtml({ title, body, url }) });
        emailSent = true;
      } catch (error) {
        console.error("Failed to send comment notification email", error);
      }

      await db
        .insert(notificationLog)
        .values({
          ...logBase,
          channel: "email",
          status: emailSent ? "sent" : "failed",
          dedupKey,
          sentAt: emailSent ? new Date() : null,
        })
        .onConflictDoNothing({ target: [notificationLog.dedupKey] });
    }
  } catch (error) {
    console.error("notifyCommentEvent failed", error);
  }
}
