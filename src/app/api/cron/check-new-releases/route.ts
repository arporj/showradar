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
import { todayBrDateString } from "@/lib/release-dates";
import { getTvSeason, tmdbImageUrl, type TmdbEpisodeRef } from "@/lib/tmdb";
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
  episodeName: string | null;
  dedupSuffix: string;
  imageUrl: string | null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // As datas comparadas aqui já saem do sync como disponibilidade no Brasil
  // (ver tmdb-sync.ts) — para redes com atraso, o cron das 9h dispara na
  // manhã em que o episódio ficou assistível de madrugada, não um dia antes.
  const today = todayBrDateString();

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
    } catch (error) {
      // One title's TMDb hiccup shouldn't block every other title's check.
      console.error(`[cron] sync failed for title ${title.titleId} (tmdb ${title.tmdbId})`, error);
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
          episodeName: null,
          dedupSuffix: fresh.releaseDate,
          imageUrl: tmdbImageUrl(fresh.posterPath, "w500"),
        });
      }
      continue;
    }

    // O TMDb às vezes ainda não rolou o episódio de `next_episode_to_air` para
    // `last_episode_to_air` no horário em que o cron das 9h roda, mesmo que a
    // data de disponibilidade já seja hoje — daí checar os dois campos. Sem
    // isso, o episódio nunca dispara: no dia seguinte `last_episode_to_air`
    // já aponta pra ontem, então a checagem de igualdade a `today` nunca mais
    // bate (visto em "A Casa do Dragão" T3E5 e T3E6).
    const lastEpisode = fresh.lastEpisodeToAir as TmdbEpisodeRef | null;
    const nextEpisode = fresh.nextEpisodeToAir as TmdbEpisodeRef | null;
    const airedEpisode =
      lastEpisode?.air_date === today ? lastEpisode : nextEpisode?.air_date === today ? nextEpisode : null;
    if (!airedEpisode) continue;

    const notificationType: NotificationType = airedEpisode.episode_number === 1 ? "new_season" : "new_episode";
    if (notificationType === "new_episode") {
      const genres = (fresh.genres as { id: number; name: string }[] | null) ?? [];
      if (genres.some((g) => TALK_OR_NEWS_GENRE_IDS.has(g.id))) continue;
    }

    // O ref de episódio do /tv/{id} não traz still_path (ver TmdbEpisodeRef) —
    // busca a temporada à parte só para pegar a foto do episódio. Cai pro
    // poster da série se o still ainda não existir no TMDb (comum em
    // episódios recém-lançados) ou se a chamada falhar.
    let stillPath: string | null = null;
    try {
      const season = await getTvSeason(fresh.tmdbId, airedEpisode.season_number);
      stillPath =
        season.episodes.find((e) => e.episode_number === airedEpisode.episode_number)?.still_path ?? null;
    } catch (error) {
      console.error(`[cron] failed to fetch season still for title ${fresh.id}`, error);
    }

    events.push({
      titleId: fresh.id,
      tmdbId: fresh.tmdbId,
      mediaType: "tv",
      name: fresh.name,
      notificationType,
      episodeLabel: `T${airedEpisode.season_number}E${airedEpisode.episode_number}`,
      episodeName: airedEpisode.name || null,
      dedupSuffix: `${airedEpisode.season_number}-${airedEpisode.episode_number}`,
      imageUrl: tmdbImageUrl(stillPath ?? fresh.posterPath, "w500"),
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

      // "Já está disponível" era enganoso pra redes com horário fixo de
      // lançamento (ex.: HBO solta episódios só às 22h) — o cron roda de
      // manhã, então a notificação chegava horas antes do episódio existir
      // de fato. A frase agora não promete disponibilidade imediata.
      const episodeSuffix = event.episodeName ? `${event.episodeLabel} - ${event.episodeName}` : event.episodeLabel;
      const title =
        event.notificationType === "new_movie_release"
          ? `${event.name} já está disponível`
          : event.notificationType === "new_season"
            ? `Hoje tem uma nova temporada de ${event.name}!`
            : `Hoje tem um novo episódio de ${event.name}!`;
      const body =
        event.notificationType === "new_movie_release"
          ? "Já disponível para assistir"
          : `Divirta-se com o episódio ${episodeSuffix}`;
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
            const errors: string[] = [];
            for (const subscription of subscriptions) {
              const result = await sendPushNotification(
                { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
                { title, body, url },
              );
              if (result.ok) {
                anySent = true;
              } else {
                errors.push(result.error);
                console.error(
                  `[cron] push failed for user ${user.userId} title ${event.titleId} (expired=${result.expired})`,
                  result.error,
                );
                if (result.expired) {
                  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
                }
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
                error: anySent ? null : errors.join("; ") || null,
              })
              .onConflictDoNothing({ target: [notificationLog.dedupKey] });

            if (anySent) sent++;
            else failed++;
          } else {
            console.log(`[cron] user ${user.userId} has pushEnabled but no push_subscriptions row for title ${event.titleId}`);
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
        let emailError: string | null = null;
        try {
          await sendEmail({
            to: user.email,
            subject: title,
            htmlContent: notificationEmailHtml({ title, body, url, imageUrl: event.imageUrl }),
          });
          emailSent = true;
        } catch (error) {
          emailError = error instanceof Error ? error.message : "unknown_error";
          console.error(`[cron] email failed for user ${user.userId} title ${event.titleId}`, error);
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
            error: emailError,
          })
          .onConflictDoNothing({ target: [notificationLog.dedupKey] });

        if (emailSent) sent++;
        else failed++;
      }
    }
  }

  const summary = {
    titlesChecked: trackedTitles.length,
    eventsFound: events.length,
    events: events.map((e) => ({ name: e.name, type: e.notificationType, label: e.episodeLabel })),
    notificationsSent: sent,
    notificationsFailed: failed,
    duplicatesSkipped: skippedDuplicate,
    skippedQuietHours,
  };
  console.log("[cron] check-new-releases summary", summary);

  return NextResponse.json(summary);
}
