// The public site's address for canonical links, the sitemap and share
// cards. Set NEXT_PUBLIC_SITE_URL to https://www.leander3t.com at cutover.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");
