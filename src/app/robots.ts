import type { MetadataRoute } from "next";
import { SITE } from "@/site/config";

/** The marketing pages are public; the app itself is not for search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/workspace/"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
