import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import {
  absoluteUrl,
  getSiteUrl,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TWITTER_CARD,
} from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  applicationName: SITE_NAME,
  title: {
    default: "PediObra — materiais de construção com entrega planejada",
    template: "%s | PediObra",
  },
  description:
    "PediObra conecta compra, gestão e entrega de materiais de construção com conteúdo prático para planejar obras com menos desperdício.",
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PediObra",
    description:
      "Materiais de construção, entrega planejada e guias práticos para obra.",
    url: getSiteUrl(),
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    type: "website",
    images: [
      {
        url: absoluteUrl("/blog/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "PediObra",
      },
    ],
  },
  twitter: {
    card: SITE_TWITTER_CARD,
    title: "PediObra",
    description:
      "Materiais de construção, entrega planejada e guias práticos para obra.",
    images: [absoluteUrl("/blog/opengraph-image")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
