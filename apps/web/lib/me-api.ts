import { authFetch, getToken } from "./auth";

export type UserState = { completed: string[]; bookmarked: string[] };
export type BookmarkItem = {
  title: string;
  readingTime: number;
  topicSlug: string;
  topicTitle: string;
  sectionSlug: string;
  sectionTitle: string;
  slug: string;
};

export type DashboardData = {
  topicProgress: {
    slug: string;
    title: string;
    accent: string | null;
    icon: string | null;
    total: number;
    completed: number;
  }[];
  lastRead: {
    topicSlug: string;
    topicTitle: string;
    sectionSlug: string;
    slug: string;
    title: string;
    readingTime: number;
  } | null;
  bookmarkCount: number;
  completedCount: number;
  /** Haftalik hisobot xatiga obuna. */
  emailOptIn: boolean;
  /** Normallashtirilgan telefon (998...) yoki null. */
  phone: string | null;
  phoneVerified: boolean;
};

export const isLoggedIn = () => !!getToken();

export const getState = () => authFetch<UserState>("/me/state");
export const getDashboard = () => authFetch<DashboardData>("/me/dashboard");

/** Haftalik hisobot xatiga obunani yoqish/o'chirish. */
export const setEmailOptIn = (optIn: boolean) =>
  authFetch<{ emailOptIn: boolean }>("/me/email-optin", {
    method: "PUT",
    body: JSON.stringify({ optIn }),
  });
export const markRead = (id: string) =>
  authFetch(`/me/progress/${id}`, { method: "POST" });
export const unmarkRead = (id: string) =>
  authFetch(`/me/progress/${id}`, { method: "DELETE" });
export const addBookmark = (id: string) =>
  authFetch(`/me/bookmark/${id}`, { method: "POST" });
export const removeBookmark = (id: string) =>
  authFetch(`/me/bookmark/${id}`, { method: "DELETE" });
export const getBookmarks = (take = 20, skip = 0) =>
  authFetch<{ items: BookmarkItem[]; total: number }>(`/me/bookmarks?take=${take}&skip=${skip}`);

// Highlight + inline izoh (24-vazifa)
export type Highlight = {
  id: string;
  articleId: string;
  quote: string;
  prefix: string | null;
  note: string | null;
  color: string;
  createdAt: string;
};
export const getHighlights = (articleId: string) =>
  authFetch<Highlight[]>(`/me/highlights/${articleId}`);
export const createHighlight = (data: {
  articleId: string;
  quote: string;
  prefix?: string;
  note?: string;
  color?: string;
}) => authFetch<Highlight>("/me/highlights", { method: "POST", body: JSON.stringify(data) });
export const updateHighlightNote = (id: string, note: string) =>
  authFetch(`/me/highlights/${id}`, { method: "PUT", body: JSON.stringify({ note }) });
export const deleteHighlight = (id: string) =>
  authFetch(`/me/highlights/${id}`, { method: "DELETE" });

// O'qish pozitsiyasi (5-vazifa)
export const saveScroll = (id: string, pct: number) =>
  authFetch(`/me/progress/${id}/scroll`, { method: "PUT", body: JSON.stringify({ pct }) });
export const getScroll = (id: string) =>
  authFetch<{ scrollPct: number | null; completed: boolean }>(`/me/progress/${id}/scroll`);

export const getNote = (id: string) =>
  authFetch<{ body: string } | null>(`/me/notes/${id}`);
export const saveNote = (id: string, body: string) =>
  authFetch(`/me/notes/${id}`, { method: "PUT", body: JSON.stringify({ body }) });
export const deleteNote = (id: string) =>
  authFetch(`/me/notes/${id}`, { method: "DELETE" });

// ─── Kunlik faollik / maqsad (4,30-vazifa) ───────────────────────────────────
export type TodayActivity = {
  date: string;
  minutes: number;
  goal: number;
  articlesRead: number;
  cardsReviewed: number;
  quizzesTaken: number;
  goalMet: boolean;
  pct: number;
};

export type ActivityDelta = {
  minutes?: number;
  articlesRead?: number;
  cardsReviewed?: number;
  quizzesTaken?: number;
};

export type Insights = {
  heatmap: { date: string; minutes: number }[];
  weekly: { week: string; minutes: number }[];
  totals: { totalMinutes: number; activeDays: number; totalArticles: number; totalCards: number };
};

export const addActivity = (delta: ActivityDelta) =>
  authFetch("/me/activity", { method: "POST", body: JSON.stringify(delta) });
export const getTodayActivity = () => authFetch<TodayActivity>("/me/activity/today");
export const setDailyGoal = (minutes: number) =>
  authFetch<{ dailyGoalMinutes: number }>("/me/goal", {
    method: "PUT",
    body: JSON.stringify({ minutes }),
  });
export const setCefr = (level: string) =>
  authFetch<{ cefrLevel: string | null }>("/me/cefr", {
    method: "PUT",
    body: JSON.stringify({ level }),
  });
export const getInsights = () => authFetch<Insights>("/me/insights");

export type Recommendations = {
  nextArticle: { topicSlug: string; sectionSlug: string; slug: string; title: string } | null;
  weakTopics: { slug: string; title: string; count: number }[];
};
export const getRecommendations = () => authFetch<Recommendations>("/me/recommendations");
