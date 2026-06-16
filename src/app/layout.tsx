import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meghan Clarisse Cave",
  description:
    "Colorado-based singer-songwriter — shows, music, merch, and press.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://megcmusic.com",
  ),
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
