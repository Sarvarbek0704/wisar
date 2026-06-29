"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  FileQuestion,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { getTopic, type TopicDetail, type ArticleMeta } from "@/lib/api";
import {
  deleteArticle,
  deleteSection,
  updateSection,
  updateArticle,
} from "@/lib/admin-api";
import { adminCreateQuiz, adminDeleteQuiz } from "@/lib/engage-api";
import { toast, confirmDialog, promptDialog } from "@/lib/ui";

export default function TopicManage() {
  const params = useParams();
  const slug = params.slug as string;
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setTopic(await getTopic(slug).catch(() => null));
    setLoading(false);
  }, [slug]);
  useEffect(() => {
    load();
  }, [load]);

  async function removeArticle(id: string, title: string) {
    if (!(await confirmDialog(`"${title}" maqolasi o'chsinmi?`))) return;
    await deleteArticle(id);
    toast("Maqola o'chirildi");
    load();
  }
  async function removeSection(id: string, title: string) {
    if (!(await confirmDialog(`"${title}" bo'limi va undagi maqolalar o'chsinmi?`)))
      return;
    await deleteSection(id);
    toast("Bo'lim o'chirildi");
    load();
  }
  async function renameSection(id: string, old: string) {
    const title = await promptDialog("Bo'lim nomi:", old);
    if (!title || title === old) return;
    await updateSection(id, { title });
    toast("Saqlandi");
    load();
  }
  async function addQuiz(sectionId: string) {
    const title = await promptDialog("Test nomi:");
    if (!title) return;
    await adminCreateQuiz({ sectionId, title });
    toast("Test qo'shildi");
    load();
  }
  async function removeQuiz(id: string, title: string) {
    if (!(await confirmDialog(`"${title}" testi o'chsinmi?`))) return;
    await adminDeleteQuiz(id);
    toast("Test o'chirildi");
    load();
  }
  async function moveArticle(
    articles: ArticleMeta[],
    index: number,
    dir: "up" | "down",
  ) {
    const j = dir === "up" ? index - 1 : index + 1;
    if (j < 0 || j >= articles.length) return;
    const a = articles[index];
    const b = articles[j];
    const ao = a.order === b.order ? index : a.order;
    const bo = a.order === b.order ? j : b.order;
    await Promise.all([
      updateArticle(a.id, { order: bo }),
      updateArticle(b.id, { order: ao }),
    ]);
    load();
  }

  if (loading) return <p className="font-sans text-soft">Yuklanmoqda...</p>;
  if (!topic)
    return (
      <p className="font-sans text-soft">
        Mavzu topilmadi.{" "}
        <Link href="/admin" className="text-accent">
          Orqaga
        </Link>
      </p>
    );

  return (
    <div className="font-sans">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-soft hover:text-accent"
      >
        <ArrowLeft size={15} />
        Mavzular
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-ink">{topic.title}</h1>

      <div className="space-y-6">
        {topic.sections.map((s) => (
          <section key={s.id} className="rounded-2xl border border-line bg-page p-5">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-bold text-ink">{s.title}</h2>
              <button
                onClick={() => renameSection(s.id, s.title)}
                title="Nomini o'zgartirish"
                className="text-soft hover:text-accent"
              >
                <Pencil size={14} />
              </button>
              <div className="ml-auto flex items-center gap-2">
                <Link
                  href={`/admin/articles/new?section=${s.id}&topic=${topic.slug}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  <Plus size={14} />
                  Maqola
                </Link>
                <button
                  onClick={() => removeSection(s.id, s.title)}
                  title="Bo'limni o'chirish"
                  className="text-soft hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {s.articles.map((a, ai) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {a.title}
                  </span>
                  <button
                    onClick={() => moveArticle(s.articles, ai, "up")}
                    disabled={ai === 0}
                    className="flex-none text-soft hover:text-accent disabled:opacity-30"
                    title="Yuqoriga"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    onClick={() => moveArticle(s.articles, ai, "down")}
                    disabled={ai === s.articles.length - 1}
                    className="flex-none text-soft hover:text-accent disabled:opacity-30"
                    title="Pastga"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="flex-none text-soft hover:text-accent"
                    title="Tahrirlash"
                  >
                    <Pencil size={15} />
                  </Link>
                  <button
                    onClick={() => removeArticle(a.id, a.title)}
                    className="flex-none text-soft hover:text-red-500"
                    title="O'chirish"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
              {s.articles.length === 0 && (
                <li className="px-4 py-3 text-sm text-soft">
                  Maqola yo'q. "Maqola" tugmasi bilan qo'shing.
                </li>
              )}
            </ul>

            {/* Testlar */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-soft">
                Testlar:
              </span>
              {s.quizzes?.map((q) => (
                <span
                  key={q.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs"
                >
                  <Link
                    href={`/admin/quizzes/${q.id}`}
                    className="flex items-center gap-1 text-accent hover:underline"
                  >
                    <FileQuestion size={13} />
                    {q.title}
                  </Link>
                  <button
                    onClick={() => removeQuiz(q.id, q.title)}
                    className="text-soft hover:text-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
              <button
                onClick={() => addQuiz(s.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-2.5 py-1 text-xs text-soft hover:border-accent/40 hover:text-accent"
              >
                <Plus size={13} />
                Test
              </button>
            </div>
          </section>
        ))}
        {topic.sections.length === 0 && (
          <p className="text-soft">
            Bo'lim yo'q. Mavzular sahifasida bo'lim qo'shing.
          </p>
        )}
      </div>
    </div>
  );
}
