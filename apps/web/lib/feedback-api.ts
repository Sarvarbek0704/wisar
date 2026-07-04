import { authFetch } from "./auth";

export type FeedbackItem = {
  id: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  category: string;
  message: string;
  page: string | null;
  read: boolean;
  createdAt: string;
};

export type SubmitFeedbackInput = {
  category: string;
  message: string;
  name?: string;
  email?: string;
  page?: string;
};

/** Fikr yuborish — kirgan yoki mehmon (token bo'lsa avtomatik qo'shiladi). */
export const submitFeedback = (data: SubmitFeedbackInput) =>
  authFetch<{ ok: boolean; id: string }>("/feedback", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminListFeedback = (filter: "all" | "unread" = "all", take = 30, skip = 0) =>
  authFetch<{ items: FeedbackItem[]; total: number; unread: number }>(
    `/feedback/admin?filter=${filter}&take=${take}&skip=${skip}`,
  );

export const adminMarkFeedbackRead = (id: string, read = true) =>
  authFetch(`/feedback/admin/${id}/read`, {
    method: "PATCH",
    body: JSON.stringify({ read }),
  });

export const adminDeleteFeedback = (id: string) =>
  authFetch(`/feedback/admin/${id}`, { method: "DELETE" });

export const adminFeedbackUnread = () =>
  authFetch<{ count: number }>("/feedback/admin/unread-count");
