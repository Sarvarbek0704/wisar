import { authFetch } from "./auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Izohlar ----
export type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  author: string;
};

export async function getComments(articleId: string): Promise<CommentItem[]> {
  const res = await fetch(`${API}/api/comments?articleId=${articleId}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}
export const postComment = (articleId: string, body: string) =>
  authFetch("/comments", {
    method: "POST",
    body: JSON.stringify({ articleId, body }),
  });
export const deleteComment = (id: string) =>
  authFetch(`/comments/${id}`, { method: "DELETE" });

// ---- Testlar ( common) ----
export type QuizForTaking = {
  id: string;
  title: string;
  questions: { id: string; text: string; options: string[] }[];
};
export type QuizResult = {
  score: number;
  total: number;
  results: {
    questionId: string;
    correctIndex: number;
    explanation: string | null;
    your: number;
    correct: boolean;
  }[];
};

export async function getQuiz(id: string): Promise<QuizForTaking> {
  const res = await fetch(`${API}/api/quizzes/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Test topilmadi");
  return res.json();
}
export async function submitQuiz(
  id: string,
  answers: number[],
): Promise<QuizResult> {
  const res = await fetch(`${API}/api/quizzes/${id}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  return res.json();
}

// ---- Admin: quiz / savol ----
export type AdminQuiz = {
  id: string;
  title: string;
  sectionId: string;
  questions: {
    id: string;
    text: string;
    options: string[];
    correctIndex: number;
    explanation: string | null;
    order: number;
  }[];
};
export const adminQuizForEdit = (id: string) =>
  authFetch<AdminQuiz>(`/admin/quizzes/${id}`);
export const adminCreateQuiz = (data: Record<string, unknown>) =>
  authFetch("/admin/quizzes", { method: "POST", body: JSON.stringify(data) });
export const adminDeleteQuiz = (id: string) =>
  authFetch(`/admin/quizzes/${id}`, { method: "DELETE" });
export const adminCreateQuestion = (data: Record<string, unknown>) =>
  authFetch("/admin/questions", { method: "POST", body: JSON.stringify(data) });
export const adminDeleteQuestion = (id: string) =>
  authFetch(`/admin/questions/${id}`, { method: "DELETE" });
