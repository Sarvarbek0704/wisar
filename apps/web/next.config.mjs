import { withSentryConfig } from "@sentry/nextjs";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Xavfsizlik sarlavhalari.
 *
 * CSP bu yerda ikkinchi himoya qatlami: maqola kontenti markdown'dan HTML'ga
 * aylantirilib `dangerouslySetInnerHTML` bilan chiqariladi, ya'ni kontentga
 * tushib qolgan skript brauzerda bajarilardi. Access token localStorage'da
 * turgani uchun bu jiddiy.
 *
 * Eslatma: Next.js inline skriptlardan foydalanadi, shuning uchun script-src'da
 * 'unsafe-inline' qoladi. CSP shunda ham tashqi manbalarga ulanishni,
 * <object>/<embed> va frame'ga solishni bloklaydi.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data:",
  `connect-src 'self' ${apiOrigin} https://plausible.io https://*.sentry.io`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@wisar/content"],
  // Docker uchun mustaqil (standalone) build — faqat kerakli fayllarni chiqaradi (kichik image)
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Sentry faqat SENTRY_DSN bo'lsa wraplaydi
const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export default sentryDsn
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG || "",
      project: process.env.SENTRY_PROJECT || "wisar-web",
    })
  : nextConfig;
