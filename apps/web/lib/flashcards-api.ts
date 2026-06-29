import { authFetch, getToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type FlashcardDeck = {
  id: string;
  slug: string;
  title: string;
  level: string;
  _count: { cards: number };
};

export type FlashcardWithReview = {
  id: string;
  front: string;
  back: string;
  ipa?: string | null;
  example?: string | null;
  pos?: string | null;
  review?: {
    nextReview: string;
    interval: number;
    easeFactor: number;
  } | null;
};

export type DeckWithCards = {
  id: string;
  slug: string;
  title: string;
  level: string;
  cards: FlashcardWithReview[];
};

export type FlashcardStats = {
  total: number;
  mastered: number;
  due: number;
  byDeck: { deckSlug: string; due: number; mastered: number }[];
};

export async function getDecks(): Promise<FlashcardDeck[]> {
  const res = await fetch(`${API}/api/flashcards/decks`);
  if (!res.ok) throw new Error("Flashcard dastalari yuklanmadi");
  return res.json();
}

export async function getDeckCards(deckSlug: string): Promise<DeckWithCards> {
  const token = getToken();
  const res = await fetch(`${API}/api/flashcards/${deckSlug}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Dasta yuklanmadi");
  return res.json();
}

export async function reviewCard(cardId: string, quality: 0 | 1 | 2 | 3 | 4 | 5): Promise<void> {
  await authFetch("/flashcards/review", {
    method: "POST",
    body: JSON.stringify({ cardId, quality }),
  });
}

export async function getStats(): Promise<FlashcardStats> {
  return authFetch<FlashcardStats>("/flashcards/stats");
}
