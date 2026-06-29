import { authFetch } from "./auth";

export type DueCount = { cards: number; questions: number; total: number };

export type ReviewCardItem = {
  kind: "card";
  refId: string;
  front: string;
  back: string;
  ipa: string | null;
  example: string | null;
  source: string;
  nextReview: string;
};

export type ReviewQuestionItem = {
  kind: "question";
  refId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
  source: string;
  nextReview: string;
};

export type ReviewQueueItem = ReviewCardItem | ReviewQuestionItem;

export const getDueCount = () => authFetch<DueCount>("/review/due-count");
export const getReviewQueue = () => authFetch<ReviewQueueItem[]>("/review/queue");
export const gradeReview = (kind: "card" | "question", refId: string, quality: number) =>
  authFetch<{ interval: number; nextReview: string }>("/review/grade", {
    method: "POST",
    body: JSON.stringify({ kind, refId, quality }),
  });
