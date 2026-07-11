import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import {
  notificationLog,
  notificationPreferences,
  pushSubscriptions,
  titles as titlesTable,
  userLibrary,
  users,
} from "@/db/schema";
import { db } from "@/lib/db";
import { notificationEmailHtml, sendEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";
import { isWithinQuietHours } from "@/lib/quiet-hours";
import type { TmdbEpisodeRef } from "@/lib/tmdb";
import { syncTitleFromTmdb } from "@/lib/tmdb-sync";

// TMDb TV genre ids — talk shows and news air near-daily, so a per-episode
// push for each of them would be spam. New-season/movie-release alerts are
// unaffected; those are rare enough per title to stay meaningful.
const TALK_OR_NEWS_GENRE_IDS = new Set([10767, 10763]);

type NotificationType = "new_episode" | "new_season" | "new_movie_release";

interface ReleaseEvent {
  titleId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  name: string;
  notificationType: NotificationType;
  episodeLabel: string | null;
  dedupSuffix: string;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = todayDateString();

  const trackedTitles = await db
    .selectDistinct({
      titleId: titlesTable.id,
      tmdbId: titlesTable.tmdbId,
      mediaType: titlesTable.mediaType,
    })
    .from(userLibrary)
    .innerJoin(titlesTable, eq(userLibrary.titleId, titlesTable.id))
    .where(ne(userLibrary.status, "dropped"));

  const events: ReleaseEvent[] = [];

  for (const title of trackedTitles) {
    try {
      await syncTitleFromTmdb(title.mediaType, title.tmdbId);
    } catch {
      // One title's TMDb hiccup shouldn't block every other title's check.
      continue;
    }

    const [fresh] = await db.select().from(titlesTable).where(eq(titlesTable.id, title.titleId));
    if (!fresh) continue;

    if (fresh.mediaType === "movie") {
      if (fresh.releaseDate === today) {
        events.push({
          titleId: fresh.id,
          tmdbId: fresh.tmdbId,
          mediaType: "movie",
          name: fresh.name,
          notificationType: "new_movie_release",
          episodeLabel: null,
          dedupSuffix: fresh.releaseDate,
        });
      }
      continue;
    }

    const lastEpisode = fresh.lastEpisodeToAir as TmdbEpisodeRef | null;
    if (lastEpisode?.air_date !== today) continue;

    const notificationType: NotificationType = lastEpisode.episode_number === 1 ? "new_season" : "new_episode";
    if (notificationType === "new_episode") {
      const genres = (fresh.genres as { id: number; name: string }[] | null) ?? [];
      if (genres.some((g) => TALK_OR_NEWS_GENRE_IDS.has(g.id))) continue;
    }

    events.push({
      titleId: fresh.id,
      tmdbId: fresh.tmdbId,
      mediaType: "tv",
      name: fresh.name,
      notificationType,
      episodeLabel: `T${lastEpisode.season_number}E${lastEpisode.episode_number}`,
      dedupSuffix: `${lastEpisode.season_number}-${lastEpisode.episode_number}`,
    });
  }

  let sent = 0;
  let failed = 0;
  let skippedDuplicate = 0;
  let skippedQuietHours = 0;

  for (const event of events) {
    const eligibleUsers = await db
      .select({
        userId: userLibrary.userId,
        email: users.email,
        pushEnabled: notificationPreferences.pushEnabled,
        emailEnabled: notificationPreferences.emailEnabled,
        notifyNewEpisode: notificationPreferences.notifyNewEpisode,
        notifyNewSeason: notificationPreferences.notifyNewSeason,
        quietHoursStart: notificationPreferences.quietHoursStart,
        quietHoursEnd: notificationPreferences.quietHoursEnd,
        timezone: notificationPreferences.timezone,
      })
      .from(userLibrary)
      .innerJoin(notificationPreferences, eq(notificationPreferences.userId, userLibrary.userId))
      .innerJoin(users, eq(users.id, userLibrary.userId))
      .where(and(eq(userLibrary.titleId, event.titleId), ne(userLibrary.status, "dropped")));

    for (const user of eligibleUsers) {
      // new_movie_release has no dedicated preference column — it's gated
      // by the same "notify me about new content" toggle as new_episode.
      if (event.notificationType === "new_season" ? !user.notifyNewSeason : !user.notifyNewEpisode) continue;

      if (isWithinQuietHours(new Date(), user.timezone, user.quietHoursStart, user.quietHoursEnd)) {
        skippedQuietHours++;
        continue;
      }

      const title =
        event.notificationType === "new_movie_release"
          ? `${event.name} já está disponível`
          : event.notificationType === "new_season"
            ? `Nova temporada de ${event.name}`
            : `Novo episódio de ${event.name}`;
      const body = event.episodeLabel ? `${event.episodeLabel} já está disponível` : "Já disponível para assistir";
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/title/${event.mediaType}/${event.tmdbId}`;

      if (user.pushEnabled) {
        const pushDedupKey = `push:${user.userId}:${event.titleId}:${event.notificationType}:${event.dedupSuffix}`;
        const [existingPushLog] = await db
          .select({ id: notificationLog.id })
          .from(notificationLog)
          .where(eq(notificationLog.dedupKey, pushDedupKey));

        if (!existingPushLog) {
          const subscriptions = await db
            .select()
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, user.userId));

          if (subscriptions.length > 0) {
            let anySent = false;
            for (const subscription of subscriptions) {
              const result = await sendPushNotification(
                { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
                { title, body, url },
              );
              if (result.ok) {
                anySent = true;
              } else if (result.expired) {
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
              }
            }

            await db
              .insert(notificationLog)
              .values({
                userId: user.userId,
                titleId: event.titleId,
                channel: "push",
                notificationType: event.notificationType,
                status: anySent ? "sent" : "failed",
                dedupKey: pushDedupKey,
                sentAt: anySent ? new Date() : null,
              })
              .onConflictDoNothing({ target: [notificationLog.dedupKey] });

            if (anySent) sent++;
            else failed++;
          }
        } else {
          skippedDuplicate++;
        }
      }

      if (user.emailEnabled) {
        const emailDedupKey = `email:${user.userId}:${event.titleId}:${event.notificationType}:${event.dedupSuffix}`;
        const [existingEmailLog] = await db
          .select({ id: notificationLog.id })
          .from(notificationLog)
          .where(eq(notificationLog.dedupKey, emailDedupKey));

        if (existingEmailLog) {
          skippedDuplicate++;
          continue;
        }

        let emailSent = false;
        try {
          await sendEmail({ to: user.email, subject: title, htmlContent: notificationEmailHtml({ title, body, url }) });
          emailSent = true;
        } catch (error) {
          console.error("Failed to send notification email", error);
        }

        await db
          .insert(notificationLog)
          .values({
            userId: user.userId,
            titleId: event.titleId,
            channel: "email",
            notificationType: event.notificationType,
            status: emailSent ? "sent" : "failed",
            dedupKey: emailDedupKey,
            sentAt: emailSent ? new Date() : null,
          })
          .onConflictDoNothing({ target: [notificationLog.dedupKey] });

        if (emailSent) sent++;
        else failed++;
      }
    }
  }

  return NextResponse.json({
    titlesChecked: trackedTitles.length,
    eventsFound: events.length,
    notificationsSent: sent,
    notificationsFailed: failed,
    duplicatesSkipped: skippedDuplicate,
    skippedQuietHours,
  });
}
