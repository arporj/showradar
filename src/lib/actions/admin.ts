"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import { ajustesDataLancamento, titles, users } from "@/db/schema";
import { ajusteDataLancamentoSchema, type AjusteDataLancamentoEntrada } from "@/dominio/ajuste-data-lancamento";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedTitleId, ressincronizarDatasDaSerie, syncTitleFromTmdb } from "@/lib/tmdb-sync";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}

export async function setUserPlan(userId: string, plan: "free" | "premium") {
  await requireAdmin();

  await db.update(users).set({ plan, updatedAt: new Date() }).where(eq(users.id, userId));

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function setUserSuspended(userId: string, isSuspended: boolean) {
  await requireAdmin();

  await db.update(users).set({ isSuspended, updatedAt: new Date() }).where(eq(users.id, userId));

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export type ResultadoAjuste = { ok: true } | { ok: false; erro: string };

const ERRO_GENERICO_AJUSTE = "Não foi possível salvar agora. Tente de novo em alguns minutos.";

// Grava (ou troca) o ajuste manual da data de lançamento no Brasil de uma
// série e regrava na hora as datas já em cache, para o site, o "Em breve" e
// os avisos passarem a usar a data nova sem esperar a próxima sincronização.
export async function salvarAjusteDataLancamento(entrada: AjusteDataLancamentoEntrada): Promise<ResultadoAjuste> {
  const session = await requireAdmin();
  const validacao = ajusteDataLancamentoSchema.safeParse(entrada);
  if (!validacao.success) return { ok: false, erro: validacao.error.issues[0].message };
  const { tmdbId, dias, motivo } = validacao.data;

  let titleId = await getCachedTitleId("tv", tmdbId);
  if (!titleId) {
    try {
      titleId = await syncTitleFromTmdb("tv", tmdbId);
    } catch (erro) {
      console.error(`[admin] série ${tmdbId} não encontrada no TMDb ao salvar ajuste de data`, erro);
      return { ok: false, erro: "Não achamos uma série com esse número no TMDb. Confira o número no endereço da série." };
    }
  }

  const valores = { dias, motivo, atualizadoPor: session.user.id, atualizadoEm: new Date() };
  try {
    await db
      .insert(ajustesDataLancamento)
      .values({ titleId, ...valores })
      .onConflictDoUpdate({ target: ajustesDataLancamento.titleId, set: valores });
    await ressincronizarDatasDaSerie(tmdbId);
  } catch (erro) {
    console.error(`[admin] falha ao salvar ajuste de data da série ${tmdbId}`, erro);
    return { ok: false, erro: ERRO_GENERICO_AJUSTE };
  }

  revalidatePath("/admin/titles");
  return { ok: true };
}

export async function removerAjusteDataLancamento(titleId: string): Promise<ResultadoAjuste> {
  await requireAdmin();
  const id = z.uuid().safeParse(titleId);
  if (!id.success) return { ok: false, erro: "Ajuste não encontrado." };

  try {
    const [removido] = await db
      .delete(ajustesDataLancamento)
      .where(eq(ajustesDataLancamento.titleId, id.data))
      .returning({ titleId: ajustesDataLancamento.titleId });
    if (!removido) return { ok: false, erro: "Este ajuste já tinha sido removido." };
    const [titulo] = await db.select({ tmdbId: titles.tmdbId }).from(titles).where(eq(titles.id, id.data));
    if (titulo) await ressincronizarDatasDaSerie(titulo.tmdbId);
  } catch (erro) {
    console.error(`[admin] falha ao remover ajuste de data do título ${id.data}`, erro);
    return { ok: false, erro: ERRO_GENERICO_AJUSTE };
  }

  revalidatePath("/admin/titles");
  return { ok: true };
}
