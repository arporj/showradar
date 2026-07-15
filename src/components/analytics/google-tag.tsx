import Script from "next/script";

import { GA_TRACKING_ID } from "@/lib/gtag";

/**
 * Injects the Google tag (gtag.js) only when NEXT_PUBLIC_GOOGLE_TAG_ID is set.
 * Safe to render unconditionally — returns null when the env var is absent.
 *
 * Place inside <head> via layout.tsx.
 */
export function GoogleTag() {
  if (!GA_TRACKING_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_TRACKING_ID}');
        `}
      </Script>
    </>
  );
}
