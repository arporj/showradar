/**
 * Returns the canonical base URL for the application.
 *
 * Priority:
 *  1. NEXT_PUBLIC_APP_URL (set explicitly in all envs)
 *  2. VERCEL_URL (injected automatically by Vercel on preview/production)
 *  3. localhost fallback for local development
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
