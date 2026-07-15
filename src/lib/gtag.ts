/**
 * Lightweight Google Analytics / Google Ads tag helper.
 *
 * All exports are safe no-ops when NEXT_PUBLIC_GOOGLE_TAG_ID is not set,
 * so the app never breaks in environments without a tag configured.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID ?? "";

/** Send a custom event to GA4 / Google Ads. */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!GA_TRACKING_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params);
}
