"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { notificationPreferences, pushSubscriptions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function subscribeToPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const values = {
    userId: session.user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: userAgent ?? null,
  };

  await db
    .insert(pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: [pushSubscriptions.endpoint],
      set: { ...values, lastSeenAt: new Date() },
    });

  // Subscribing is the clearest possible signal the user wants push, and
  // unsubscribing (below) the clearest signal they don't — so this flag
  // tracks the subscribe button directly instead of being a second, separate
  // on/off control that could drift out of sync with it.
  await db
    .insert(notificationPreferences)
    .values({ userId: session.user.id, pushEnabled: true })
    .onConflictDoUpdate({ target: [notificationPreferences.userId], set: { pushEnabled: true } });

  revalidatePath("/settings");
}

export async function unsubscribeFromPush(endpoint: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, session.user.id), eq(pushSubscriptions.endpoint, endpoint)));

  await db
    .update(notificationPreferences)
    .set({ pushEnabled: false })
    .where(eq(notificationPreferences.userId, session.user.id));

  revalidatePath("/settings");
}

export async function updateNotificationPreferences(input: {
  emailEnabled: boolean;
  notifyNewEpisode: boolean;
  notifyNewSeason: boolean;
  notifyMentions: boolean;
  notifyReplies: boolean;
  notifyReactions: boolean;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .insert(notificationPreferences)
    .values({ userId: session.user.id, ...input })
    .onConflictDoUpdate({ target: [notificationPreferences.userId], set: input });

  revalidatePath("/settings");
}

export async function updateQuietHours(input: {
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db
    .insert(notificationPreferences)
    .values({ userId: session.user.id, ...input })
    .onConflictDoUpdate({ target: [notificationPreferences.userId], set: input });

  revalidatePath("/settings");
}
