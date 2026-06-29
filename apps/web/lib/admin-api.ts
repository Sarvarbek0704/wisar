import { authFetch } from "./auth";

export type AdminSection = {
  id: string;
  slug: string;
  title: string;
  order: number;
  _count: { articles: number };
};
export type AdminTopic = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  accent: string | null;
  order: number;
  published: boolean;
  sections: AdminSection[];
};
export type AdminArticle = {
  id: string;
  sectionId: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  order: number;
  published: boolean;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { comments: number; progress: number; bookmarks: number; notes: number };
};

export type AdminUserDetail = AdminUser & {
  googleId: string | null;
  updatedAt: string;
  _count: {
    comments: number; progress: number; bookmarks: number;
    notes: number; plannerDays: number; flashcardReviews: number;
  };
  streak: { current: number; longest: number; lastCheckin: string | null } | null;
};

export type AdminStats = {
  totals: {
    users: number; admins: number; topics: number; sections: number;
    articles: number; publishedArticles: number; comments: number;
    quizzes: number; questions: number; flashcards: number; decks: number;
    invites: number; notes: number; bookmarks: number;
  };
  signups: { date: string; count: number }[];
  newThisWeek: number;
  latestUsers: { id: string; email: string; name: string | null; role: string; createdAt: string }[];
  latestComments: {
    id: string; body: string; createdAt: string;
    user: { name: string | null; email: string };
    article: { title: string; slug: string };
  }[];
};

export type AdminComment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  article: { title: string; slug: string };
};

export type AdminInvite = {
  id: string;
  code: string;
  createdBy: string;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export const adminOverview = () => authFetch<AdminTopic[]>("/admin/overview");
export const adminStats = () => authFetch<AdminStats>("/admin/stats");
export const adminGetArticle = (id: string) =>
  authFetch<AdminArticle>(`/admin/articles/${id}`);

// Foydalanuvchilar
export const adminListUsers = (q?: string) =>
  authFetch<AdminUser[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const adminGetUser = (id: string) =>
  authFetch<AdminUserDetail>(`/admin/users/${id}`);
export const adminSetUserRole = (id: string, role: string) =>
  authFetch(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
export const adminDeleteUser = (id: string) =>
  authFetch(`/admin/users/${id}`, { method: "DELETE" });

// Izohlar
export const adminListComments = (q?: string) =>
  authFetch<AdminComment[]>(`/admin/comments${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const adminDeleteComment = (id: string) =>
  authFetch(`/admin/comments/${id}`, { method: "DELETE" });

// Invites
export const adminListInvites = () => authFetch<AdminInvite[]>("/admin/invites");
export const adminCreateInvite = () =>
  authFetch<AdminInvite>("/admin/invites", { method: "POST" });
export const adminDeleteInvite = (id: string) =>
  authFetch(`/admin/invites/${id}`, { method: "DELETE" });

// Publish toggle
export const adminSetTopicPublished = (id: string, published: boolean) =>
  authFetch(`/admin/topics/${id}/publish`, {
    method: "PATCH",
    body: JSON.stringify({ published }),
  });
export const adminSetArticlePublished = (id: string, published: boolean) =>
  authFetch(`/admin/articles/${id}/publish`, {
    method: "PATCH",
    body: JSON.stringify({ published }),
  });

const post = (path: string, body: unknown) =>
  authFetch(path, { method: "POST", body: JSON.stringify(body) });
const patch = (path: string, body: unknown) =>
  authFetch(path, { method: "PATCH", body: JSON.stringify(body) });
const del = (path: string) => authFetch(path, { method: "DELETE" });

// Topic
export const createTopic = (data: Record<string, unknown>) =>
  post("/admin/topics", data);
export const updateTopic = (id: string, data: Record<string, unknown>) =>
  patch(`/admin/topics/${id}`, data);
export const deleteTopic = (id: string) => del(`/admin/topics/${id}`);

// Section
export const createSection = (data: Record<string, unknown>) =>
  post("/admin/sections", data);
export const updateSection = (id: string, data: Record<string, unknown>) =>
  patch(`/admin/sections/${id}`, data);
export const deleteSection = (id: string) => del(`/admin/sections/${id}`);

// Article
export const createArticle = (data: Record<string, unknown>) =>
  post("/admin/articles", data);
export const updateArticle = (id: string, data: Record<string, unknown>) =>
  patch(`/admin/articles/${id}`, data);
export const deleteArticle = (id: string) => del(`/admin/articles/${id}`);
