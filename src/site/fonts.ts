import localFont from "next/font/local";

/**
 * Self-hosted (SIL Open Font License, see ./fonts/OFL-*.txt). No request leaves the site for type.
 * Fraunces: editorial display. DM Sans: UI and body. Press Start 2P: pixel-world labels only.
 */
export const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-roman.woff2", style: "normal", weight: "100 900" },
    { path: "./fonts/fraunces-italic.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const dmSans = localFont({
  src: "./fonts/dm-sans.woff2",
  weight: "100 1000",
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const pressStart = localFont({
  src: "./fonts/press-start-2p.woff2",
  weight: "400",
  variable: "--font-press",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
});

export const fontVariables = `${fraunces.variable} ${dmSans.variable} ${pressStart.variable}`;
