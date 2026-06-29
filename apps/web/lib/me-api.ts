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
};

export const isLoggedIn = () => !!getToken();

export const getState = () => authFetch<UserState>("/me/state");
export const getDashboard = () => authFetch<DashboardData>("/me/dashboard");
export const markRead = (id: string) =>
  authFetch(`/me/progress/${id}`, { method: "POST" });
export const unmarkRead = (id: string) =>
  authFetch(`/me/progress/${id}`, { method: "DELETE" });
export const addBookmark = (id: string) =>
  authFetch(`/me/bookmark/${id}`, { method: "POST" });
export const removeBookmark = (id: string) =>
  authFetch(`/me/bookmark/${id}`, { method: "DELETE" });
export const getBookmarks = () => authFetch<BookmarkItem[]>("/me/bookmarks");

export const getNote = (id: string) =>
  authFetch<{ body: string } | null>(`/me/notes/${id}`);
export const saveNote = (id: string, body: string) =>
  authFetch(`/me/notes/${id}`, { method: "PUT", body: JSON.stringify({ body }) });
export const deleteNote = (id: string) =>
  authFetch(`/me/notes/${id}`, { method: "DELETE" });
