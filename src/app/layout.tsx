import type { Metadata } from "next";
import { SiteChrome } from "@/components/SiteChrome/SiteChrome";
import "./globals.css";

// Tolerate a missing, empty, or malformed NEXT_PUBLIC_SITE_URL — Vercel preview
// envs can pull it as an empty string, and `new URL("")` throws and fails the
// build. `??` does not catch "", so resolve defensively. See studio learning #7.
function resolveSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // fall through to the production origin
    }
  }
  return new URL("https://megcmusic.com");
}

export const metadata: Metadata = {
  title: "Meghan Clarisse Cave",
  description:
    "Colorado-based singer-songwriter — shows, music, merch, and press.",
  metadataBase: resolveSiteUrl(),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Brand type system. Delivered as a <link> rather than a CSS @import
            because Turbopack strips external @import url() from the build. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Newsreader:ital,wght@0,400;1,400&family=Open+Sans:wght@400;600;700&family=Praise&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteChrome />
        {children}
      </body>
    </html>
  );
}
