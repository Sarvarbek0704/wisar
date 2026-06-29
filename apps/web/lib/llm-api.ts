import { authFetch } from "./auth";

export type GrammarResult = {
  corrected: string;
  errors: { original: string; fix: string; why: string }[];
};

export const grammarCheck = (text: string) =>
  authFetch<GrammarResult>("/llm/grammar", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
