import type { MetadataRoute } from "next";
import { SITE } from "@/site/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}${SITE.demoPath}`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
