import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { RefreshListings } from "@/components/refresh-listings";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const display = localFont({ src: "./fonts/bricolage-latin.woff2", variable: "--font-bricolage", display: "swap", weight: "200 800" });

const body = localFont({ src: "./fonts/manrope-latin.woff2", variable: "--font-manrope", display: "swap", weight: "200 800" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pickleball Finder — find your next game in NSW",
    template: "%s · Pickleball Finder",
  },
  description: SITE_DESCRIPTION,
  keywords: ["pickleball", "Sydney pickleball", "pickleball NSW", "social play", "pickleball tournaments", "pickleball near me"],
  openGraph: {
    siteName: SITE_NAME,
    title: "Pickleball Finder",
    description: "Find your next pickleball game in seconds.",
    type: "website",
    locale: "en_AU",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-cream font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-pine focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <RefreshListings />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
