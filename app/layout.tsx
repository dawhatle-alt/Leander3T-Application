import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site/url";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Leander 3T — Brick, Stone & Stucco",
  description:
    "Exterior masonry for Central Texas production homebuilders: brick, stone and stucco.",
  applicationName: "Leander 3T",
  openGraph: {
    type: "website",
    siteName: "Leander 3T",
    locale: "en_US",
    images: [
      {
        url: "/marketing/og.jpg",
        width: 1200,
        height: 630,
        alt: "Leander 3T — Brick, Stone & Stucco",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/marketing/og.jpg"] },
};

export const viewport: Viewport = { themeColor: "#211b17" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
