import type { Metadata, Viewport } from "next";
import { SessionRoot } from "@/features/auth/session-root";
import { BRAND } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND.product} — ${BRAND.descriptor}`,
  description: BRAND.tagline,
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full"><SessionRoot>{children}</SessionRoot></body>
    </html>
  );
}
