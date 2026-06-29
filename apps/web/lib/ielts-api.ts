// AI IELTS Coach — backend (NestJS /api/ielts) bilan ishlash.
import { getToken } from "./auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type Criterion = { name: string; band: number; comment: string };
export type Correction = { original: string; better: string; why: string };

export type WritingScore = {
  overallBand: number;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
  corrections: Correction[];
  modelAnswer: string;
  wordCount: number;
};

export type SpeakingScore = {
  overallBand: number;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
  corrections: Correction[];
  modelAnswer: string;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/api/ielts${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Xatolik (${res.status})`;
    try {
      const j = (await res.json()) as { message?: string | string[] };
      if (j.message) msg = Array.isArray(j.message) ? j.message.join(", ") : j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const scoreWriting = (task: 1 | 2, prompt: string, essay: string) =>
  post<WritingScore>("/score-writing", { task, prompt, essay });

export const scoreSpeaking = (part: 1 | 2 | 3, question: string, transcript: string) =>
  post<SpeakingScore>("/score-speaking", { part, question, transcript });

export const genWritingPrompt = (task: 1 | 2, topic?: string) =>
  post<{ prompt: string }>("/writing-prompt", { task, topic });

export const genSpeakingPrompt = (part: 1 | 2 | 3, topic?: string) =>
  post<{ question: string }>("/speaking-prompt", { part, topic });

export type PracticeQuestion = {
  type: string;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
};
export type ReadingTest = { title: string; passage: string; questions: PracticeQuestion[] };
export type ListeningTest = { title: string; script: string; questions: PracticeQuestion[] };

export const genReadingTest = (topic?: string) =>
  post<ReadingTest>("/reading-test", { topic });

export const genListeningTest = (topic?: string) =>
  post<ListeningTest>("/listening-test", { topic });

// ─── Audio transkripsiya (20-vazifa, Whisper) ────────────────────────────────
export async function transcribeAudio(blob: Blob): Promise<{ text: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("audio", blob, "speech.webm");
  const res = await fetch(`${API}/api/ielts/transcribe`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let msg = `Transkripsiya xatosi (${res.status})`;
    try {
      const j = (await res.json()) as { message?: string };
      if (j.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

// Reading/Listening natijasini serverga saqlash (20,30-vazifa)
export async function recordAttempt(
  skill: "reading" | "listening" | "writing" | "speaking",
  band: number,
  detail?: unknown,
  part?: string,
): Promise<void> {
  const token = getToken();
  if (!token) return; // faqat login bo'lsa
  await fetch(`${API}/api/ielts/attempt`, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ skill, band, detail, part }),
  }).catch(() => {});
}
