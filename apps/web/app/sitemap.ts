import type { MetadataRoute } from "next";
import { getTopics, getTopic } from "@/lib/api";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

/** Dinamik sitemap (39-vazifa) — topic/section/article'lardan. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/kurslar`, changeFrequency: "weekly", priority: 0.8 },
  ];
  try {
    const topics = await getTopics();
    for (const t of topics) {
      urls.push({ url: `${SITE}/${t.slug}`, changeFrequency: "weekly", priority: 0.7 });
      const detail = await getTopic(t.slug).catch(() => null);
      if (!detail) continue;
      for (const s of detail.sections) {
        for (const a of s.articles) {
          urls.push({
            url: `${SITE}/${t.slug}/${s.slug}/${a.slug}`,
            changeFrequency: "monthly",
            priority: 0.6,
          });
        }
      }
    }
  } catch {
    // API o'chiq bo'lsa — kamida asosiy sahifalar
  }
  return urls;
}
