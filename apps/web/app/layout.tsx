import type { Metadata } from "next";
import { Inter, Titan_One, Trocchi } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/Toaster";
import { OfflineBanner } from "@/components/OfflineBanner";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { I18nProvider } from "@/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const titanOne = Titan_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-titan",
  display: "swap",
});
const trocchi = Trocchi({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-trocchi",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Wisar — O'quv platformasi",
    template: "%s — Wisar",
  },
  description:
    "Wisar — ingliz tilini A1 dan C2 gacha o'rganing. Professional, minimalist, to'liq interaktiv.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wisar",
  },
  openGraph: {
    type: "website",
    siteName: "Wisar",
    title: "Wisar — O'quv platformasi",
    description: "Ingliz tili, dasturlash va IELTS — interaktiv o'quv platformasi.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Wisar — O'quv platformasi",
    description: "Ingliz tili, dasturlash va IELTS — interaktiv o'quv platformasi.",
  },
};

export const viewport = {
  themeColor: "#0B111D",
};

/* Default: light. Manuel togglda localStorage'da saqlanadi. OS preference ishlatilmaydi. */
const themeInit = `(function(){try{var t=localStorage.getItem('wisar-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

const swInit = `(function(){if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}})();`;

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${inter.variable} ${titanOne.variable} ${trocchi.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {plausibleDomain && (
          <script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body className="min-h-screen bg-bg text-ink antialiased">
        <I18nProvider>
          <OfflineBanner />
          <AppShell>{children}</AppShell>
          <FeedbackWidget />
          <Toaster />
        </I18nProvider>
        <script dangerouslySetInnerHTML={{ __html: swInit }} />
      </body>
    </html>
  );
}
