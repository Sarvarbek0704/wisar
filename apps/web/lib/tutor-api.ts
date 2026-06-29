import { getToken } from "./auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type TutorKind = "tutor" | "roleplay";
export type TutorMessage = { role: "user" | "assistant"; content: string };
export type TutorThread = {
  id: string;
  kind: string;
  scenario: string | null;
  messages?: { role: string; content: string }[];
};

function headers(): Record<string, string> {
  const token = getToken();
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function createThread(
  kind: TutorKind,
  opts?: { articleId?: string; scenario?: string },
): Promise<TutorThread> {
  const res = await fetch(`${API}/api/tutor/thread`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ kind, ...opts }),
  });
  if (!res.ok) throw new Error("Suhbat yaratilmadi");
  return res.json();
}

export async function getThread(id: string): Promise<TutorThread> {
  const res = await fetch(`${API}/api/tutor/thread/${id}`, { headers: headers() });
  if (!res.ok) throw new Error("Suhbat topilmadi");
  return res.json();
}

/** SSE streaming javob — so'zma-so'z delta'lar (17-vazifa). */
export async function* askStream(threadId: string, question: string): AsyncGenerator<string> {
  const res = await fetch(`${API}/api/tutor/thread/${threadId}/ask`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ question }),
  });
  if (!res.ok || !res.body) throw new Error("AI javob bermadi");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const evt = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = evt.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let data: { delta?: string; error?: string; done?: boolean };
      try {
        data = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (data.error) throw new Error(data.error);
      if (data.delta) yield data.delta;
    }
  }
}

export type RoleplayFeedback = {
  strengths: string[];
  mistakes: { text: string; fix: string; why: string }[];
  tips: string[];
  level: string;
};

export async function getFeedback(threadId: string): Promise<RoleplayFeedback> {
  const res = await fetch(`${API}/api/tutor/thread/${threadId}/feedback`, {
    method: "POST",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Fikr-mulohaza olinmadi");
  return res.json();
}
