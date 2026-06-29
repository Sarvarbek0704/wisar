// NestJS API bilan ishlash — tiplar va fetch yordamchilari.
import { fetchWithTimeout, notifyOffline, ApiOfflineError } from "./http";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type Topic = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  accent: string | null;
  order: number;
  _count?: { sections: number };
};

export type ArticleMeta = {
  id: string;
  slug: string;
  title: string;
  order: number;
  readingTime: number;
  excerpt: string | null;
};

export type QuizMeta = { id: string; title: string };

export type Section = {
  id: string;
  slug: string;
  title: string;
  order: number;
  articles: ArticleMeta[];
  quizzes?: QuizMeta[];
};

export type TopicDetail = Topic & { sections: Section[] };

export type ArticleFull = {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  readingTime: number;
  section: { slug: string; title: string };
};

export type NavItem = {
  topicSlug: string;
  sectionSlug: string;
  slug: string;
  title: string;
} | null;

export type ArticleResponse = {
  topic: { slug: string; title: string; accent: string | null };
  article: ArticleFull;
  prev: NavItem;
  next: NavItem;
  articleQuiz?: { id: string; title: string } | null;
};

export type SearchResult = {
  title: string;
  excerpt: string | null;
  topicSlug: string;
  topicTitle: string;
  sectionSlug: string;
  sectionTitle: string;
  slug: string;
};

async function get<T>(path: string, revalidate = 60): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API}/api${path}`, { next: { revalidate } } as RequestInit);
  } catch (e) {
    if (e instanceof ApiOfflineError) notifyOffline();
    throw e;
  }
  if (!res.ok) throw new Error(`API xatosi: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export type SiteStats = { articles: number; sections: number; topics: number; users: number };
export const getStats = () => get<SiteStats>("/stats");
export const getTopics = () => get<Topic[]>("/topics");
export const getTopic = (slug: string) => get<TopicDetail>(`/topics/${slug}`);
export const getArticle = (t: string, s: string, a: string) =>
  get<ArticleResponse>(`/articles/${t}/${s}/${a}`);

export async function search(q: string): Promise<SearchResult[]> {
  if (q.trim().length < 2) return [];
  try {
    const res = await fetchWithTimeout(`${API}/api/search?q=${encodeURIComponent(q)}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch (e) {
    if (e instanceof ApiOfflineError) notifyOffline();
    return []; // qidiruvda jim fallback
  }
}

export { API };
