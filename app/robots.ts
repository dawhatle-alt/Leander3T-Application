import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site/url";

// Only the public site is for search engines; signed-in areas stay out.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/dashboard",
        "/jobs",
        "/orders",
        "/team",
        "/crew",
        "/portal",
        "/profile",
        "/api",
        "/auth",
        "/sign-in",
        "/forgot-password",
        "/update-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
