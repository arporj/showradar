"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { users } from "@/db/schema";
import { auth, updateSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AVATAR_BUCKET, getSupabaseAdminClient } from "@/lib/supabase";

export async function updateProfileVisibility(isPrivate: boolean) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await db.update(users).set({ isPrivate, updatedAt: new Date() }).where(eq(users.id, session.user.id));

  revalidatePath("/settings");
  if (session.user.username) revalidatePath(`/user/${session.user.username}`);
}

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export async function uploadAvatarAction(formData: FormData): Promise<{ error: string } | { url: string }> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return { error: "Nenhum arquivo enviado" };
  }
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { error: "Envie uma imagem JPEG, PNG ou WebP" };
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return { error: "A imagem deve ter no máximo 5MB" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseAdminClient();
  // Fixed key, overwritten on every upload — avoids orphaned old avatars
  // piling up in the bucket, and sidesteps "which file is current" ambiguity
  // when the user switches image formats between uploads.
  const objectKey = `${session.user.id}/avatar`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectKey, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("Failed to upload avatar", uploadError);
    return { error: "Falha ao enviar a imagem. Tente novamente." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectKey);
  // Cache-bust: the object key stays fixed across re-uploads, but the URL
  // needs to change each time so the browser/CDN doesn't keep serving the
  // previous image.
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  await db
    .update(users)
    .set({ avatarUrl, avatarSource: "upload", updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  await updateSession({});

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  if (session.user.username) revalidatePath(`/user/${session.user.username}`);

  return { url: avatarUrl };
}
