"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { createArticle } from "@/lib/admin-api";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { toast } from "@/lib/ui";

function NewArticleInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const sectionId = sp.get("section") || "";
  const topicSlug = sp.get("topic") || "";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("# Sarlavha\n\nKontent...");
  const [order, setOrder] = useState(0);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!sectionId) {
      setErr("Bo'lim aniqlanmadi");
      return;
    }
    setErr("");
    setSaving(true);
    try {
      await createArticle({ sectionId, title, content, order });
      toast("Maqola yaratildi");
      router.push(`/admin/topics/${topicSlug}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="font-sans">
      <Link
        href={`/admin/topics/${topicSlug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-soft hover:text-accent"
      >
        <ArrowLeft size={15} />
        Orqaga
      </Link>
      <h1 className="mb-5 text-2xl font-bold text-ink">Yangi maqola</h1>

      <div className="mb-3 flex flex-wrap gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Maqola sarlavhasi"
          className="flex-1 rounded-lg border border-line bg-page px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          placeholder="Tartib"
          className="w-24 rounded-lg border border-line bg-page px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
      </div>

      <MarkdownEditor value={content} onChange={setContent} />

      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}

      <button
        onClick={save}
        disabled={saving || !title}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        <Save size={17} />
        {saving ? "Saqlanmoqda..." : "Saqlash"}
      </button>
    </div>
  );
}

export default function NewArticlePage() {
  return (
    <Suspense fallback={<p className="font-sans text-soft">Yuklanmoqda...</p>}>
      <NewArticleInner />
    </Suspense>
  );
}
