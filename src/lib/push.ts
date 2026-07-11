import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must all be set");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export type PushSendResult = { ok: true } | { ok: false; expired: boolean; error: string };

/**
 * Sends one push message to one subscription. `expired: true` means the
 * endpoint is gone (404/410) and the caller should delete the subscription
 * row — the browser/OS discarded it, resending will never succeed.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionKeys,
  payload: PushPayload,
): Promise<PushSendResult> {
  ensureConfigured();

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number } | null)?.statusCode;
    return {
      ok: false,
      expired: statusCode === 404 || statusCode === 410,
      error: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
