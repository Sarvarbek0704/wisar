"use client";

import { useState } from "react";
import { Brain, Sparkles, Loader2 } from "lucide-react";
import { getUser } from "@/lib/auth";
import { generateArticleQuiz } from "@/lib/engage-api";
import { toast } from "@/lib/ui";
import { Quiz } from "./Quiz";

/**
 * Maqola oxiri active-recall test (8-vazifa).
 * Test bo'lsa ko'rsatadi; admin uchun "AI bilan savol yarat" tugmasi.
 */
export function ArticleQuiz({
  articleId,
  quiz,
}: {
  articleId: string;
  quiz: { id: string; title: string } | null;
}) {
  const [quizId, setQuizId] = useState<string | null>(quiz?.id ?? null);
  const [generating, setGenerating] = useState(false);
  const isAdmin = typeof window !== "undefined" && getUser()?.role === "admin";

  async function generate() {
    setGenerating(true);
    try {
      const created = await generateArticleQuiz(articleId);
      setQuizId(created.id);
      toast("Test yaratildi", "success");
    } catch (e) {
      toast((e as Error).message || "Test yaratilmadi", "error");
    } finally {
      setGenerating(false);
    }
  }

  if (!quizId && !isAdmin) return null;

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
        <Brain size={18} className="text-accent" />
        O'qiganingizni mustahkamlang
      </h2>

      {quizId ? (
        <Quiz quizId={quizId} />
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-page p-6 text-center">
          <p className="mb-3 text-sm text-soft">Bu maqola uchun hali test yo'q.</p>
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            AI bilan savol yarat
          </button>
        </div>
      )}
    </section>
  );
}
