import type { Metadata } from "next";
import { Inter, Titan_One, Trocchi } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/Toaster";

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
  title: {
    default: "Wisar — O'quv platformasi",
    template: "%s — Wisar",
  },
  description:
    "Wisar — ingliz tilini A1 dan C2 gacha o'rganing. Professional, minimalist, to'liq interaktiv.",
  manifest: "/manifest.json",
  themeColor: "#0B111D",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wisar",
  },
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
        <AppShell>{children}</AppShell>
        <Toaster />
        <script dangerouslySetInnerHTML={{ __html: swInit }} />
      </body>
    </html>
  );
}
