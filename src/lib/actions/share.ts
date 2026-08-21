"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { follows, titles, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { notifyCommentEvent } from "@/lib/comment-notifications";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/site";
import type { TmdbMediaType } from "@/lib/tmdb";

const MAX_MESSAGE_LENGTH = 200;

/**
 * Envia um título para amigos dentro do ShowRadar. "Amigo" aqui é follow
 * mútuo aceito, a mesma relação que /friends mostra e que o autocomplete de
 * menções usa — a lista de destinatários é revalidada no servidor em vez de
 * confiar nos ids que o cliente mandou, senão qualquer um poderia notificar
 * qualquer usuário do app.
 *
 * A entrega reaproveita notifyCommentEvent (push + e-mail, com dedup,
 * quiet-hours e respeito à preferência do destinatário) em vez de um canal
 * novo: não existe caixa de entrada in-app no produto, então uma notificação
 * com link é o que "mandar para um amigo" significa aqui.
 */
export async function shareTitleWithFriends(input: {
  titleId: string;
  mediaType: TmdbMediaType;
  tmdbId: number;
  recipientIds: string[];
  message?: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const recipientIds = [...new Set(input.recipientIds)].filter((id) => id !== session.user.id);
  if (recipientIds.length === 0) return { sentTo: 0 };

  const [title] = await db.select({ name: titles.name }).from(titles).where(eq(titles.id, input.titleId));
  if (!title) return { sentTo: 0 };

  // Mesma relação que lib/friends.ts::getFriends devolve e que /friends
  // renderiza: um follow do remetente para o destinatário já *aceito* por
  // ele. Não é uma checagem a mais que a da UI — é a mesma, refeita aqui
  // porque os ids vieram do cliente e não dá para confiar neles.
  const allowed = await db
    .select({ id: follows.followingId })
    .from(follows)
    .where(
      and(
        eq(follows.followerId, session.user.id),
        eq(follows.status, "accepted"),
        inArray(follows.followingId, recipientIds),
      ),
    );
  const allowedIds = allowed.map((row) => row.id);
  if (allowedIds.length === 0) return { sentTo: 0 };

  const [sender] = await db
    .select({ username: users.username, name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id));
  const senderName = sender?.name ?? (sender?.username ? `@${sender.username}` : "Alguém");

  const message = input.message?.trim().slice(0, MAX_MESSAGE_LENGTH);
  const url = `${getSiteUrl()}/title/${input.mediaType}/${input.tmdbId}`;
  // O par (remetente, título) entra na chave de dedup junto com o dia: mandar
  // o mesmo título duas vezes no mesmo dia não vira duas notificações, mas
  // recomendar de novo semanas depois volta a notificar.
  const dedupSuffix = `${session.user.id}:${input.titleId}:${new Date().toISOString().slice(0, 10)}`;

  await Promise.all(
    allowedIds.map((recipientUserId) =>
      notifyCommentEvent({
        recipientUserId,
        actorUserId: session.user.id,
        type: "title_shared",
        title: `${senderName} recomendou ${title.name}`,
        body: message || `${senderName} acha que você vai gostar de ${title.name}.`,
        url,
        titleId: input.titleId,
        dedupSuffix,
      }),
    ),
  );

  return { sentTo: allowedIds.length };
}
