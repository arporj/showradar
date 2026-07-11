import { eq } from "drizzle-orm";
import Link from "next/link";

import { NotificationPreferencesForm } from "@/components/settings/notification-preferences-form";
import { PrivacyToggle } from "@/components/settings/privacy-toggle";
import { PushToggle } from "@/components/settings/push-toggle";
import { notificationPreferences, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, session.user.id));

  const [account] = await db.select({ isPrivate: users.isPrivate }).from(users).where(eq(users.id, session.user.id));

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Notificações e privacidade da sua grade.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Privacidade</h2>
        <PrivacyToggle initial={account?.isPrivate ?? true} />
        <Link href="/follow-requests" className="block text-sm underline underline-offset-4">
          Ver solicitações de seguir
        </Link>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Push</h2>
        <PushToggle />
        <NotificationPreferencesForm
          initial={{
            notifyNewEpisode: prefs?.notifyNewEpisode ?? true,
            notifyNewSeason: prefs?.notifyNewSeason ?? true,
          }}
        />
      </div>
    </div>
  );
}
