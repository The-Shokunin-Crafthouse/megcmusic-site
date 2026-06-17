import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
