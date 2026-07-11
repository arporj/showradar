import { createClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";

declare global {
  var __supabaseAdminClient: ReturnType<typeof createClient> | undefined;
}

export function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }

  const client =
    global.__supabaseAdminClient ?? createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  if (process.env.NODE_ENV !== "production") {
    global.__supabaseAdminClient = client;
  }

  return client;
}
