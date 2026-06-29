import { authFetch } from "./auth";

export type ForumThreadItem = {
  id: string;
  title: string;
  createdAt: string;
  author: string;
  postCount: number;
  solved: boolean;
};

export type ForumPost = {
  id: string;
  body: string;
  createdAt: string;
  accepted: boolean;
  authorId: string;
  author: string;
};

export type ForumThreadDetail = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: string;
  ownerId: string;
  posts: ForumPost[];
};

export const listThreads = (take = 20, skip = 0) =>
  authFetch<{ items: ForumThreadItem[]; total: number }>(`/forum?take=${take}&skip=${skip}`);
export const getThread = (id: string) => authFetch<ForumThreadDetail>(`/forum/${id}`);
export const createThread = (title: string, body: string) =>
  authFetch<{ id: string }>("/forum", { method: "POST", body: JSON.stringify({ title, body }) });
export const addPost = (id: string, body: string) =>
  authFetch<{ id: string }>(`/forum/${id}/posts`, { method: "POST", body: JSON.stringify({ body }) });
export const acceptPost = (postId: string) =>
  authFetch<{ id: string; accepted: boolean }>(`/forum/posts/${postId}/accept`, { method: "POST" });
