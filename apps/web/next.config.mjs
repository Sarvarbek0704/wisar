import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@mana/content"],
};

// Sentry faqat SENTRY_DSN bo'lsa wraplaydi
const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export default sentryDsn
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG || "",
      project: process.env.SENTRY_PROJECT || "mana-web",
    })
  : nextConfig;
