import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { pushSubscriptions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Counterpart to sw.js's `pushsubscriptionchange` handler. The browser can
// silently rotate a push subscription's endpoint (key expiry, FCM token
// refresh — common on Android) with no page open to catch it through the
// normal subscribeToPush Server Action, so the SW calls this route directly
// instead — this is what re-links a rotated subscription to the DB row that
// check-new-releases/notifyCommentEvent actually send to, instead of it
// silently going stale and every future push failing.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const oldEndpoint = typeof body?.oldEndpoint === "string" ? body.oldEndpoint : null;
  const endpoint = body?.subscription?.endpoint;
  const p256dh = body?.subscription?.keys?.p256dh;
  const authKey = body?.subscription?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof authKey !== "string") {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  if (oldEndpoint && oldEndpoint !== endpoint) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, oldEndpoint));
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint,
      p256dh,
      auth: authKey,
      userAgent: request.headers.get("user-agent"),
    })
    .onConflictDoUpdate({
      target: [pushSubscriptions.endpoint],
      set: { userId: session.user.id, p256dh, auth: authKey, lastSeenAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
