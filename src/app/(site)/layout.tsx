import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/config";
import { SITE } from "@/site/config";
import { fontVariables } from "@/site/fonts";
import "@/site/site.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.title,
  description: SITE.description,
  applicationName: BRAND.product,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: BRAND.product,
    title: SITE.title,
    description: SITE.description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "A door left ajar, opening onto a pixel-art office at dusk." }],
  },
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description, images: ["/og.png"] },
  robots: { index: true, follow: true },
};

// The app shell locks zoom for the game canvas; the marketing pages must stay zoomable.
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#21172f" };

/** Marketing pages. Kept apart from the office app: own fonts, own styles, no app stores. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className={`site-root font-site ${fontVariables}`}>{children}</div>;
}
