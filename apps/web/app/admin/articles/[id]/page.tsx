"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import {
  adminGetArticle,
  updateArticle,
  deleteArticle,
} from "@/lib/admin-api";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { toast, confirmDialog } from "@/lib/ui";

export default function EditArticlePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [order, setOrder] = useState(0);
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const a = await adminGetArticle(id);
        if (a) {
          setTitle(a.title);
          setContent(a.content);
          setOrder(a.order);
          setPublished(a.published);
        }
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function save() {
    setErr("");
    setSaving(true);
    try {
      await updateArticle(id, { title, content, order, published });
      toast("Maqola saqlandi");
      router.back();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    if (!(await confirmDialog("Maqola o'chsinmi?"))) return;
    await deleteArticle(id);
    toast("Maqola o'chirildi");
    router.back();
  }

  if (loading) return <p className="font-sans text-soft">Yuklanmoqda...</p>;

  return (
    <div className="font-sans">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-soft hover:text-accent"
      >
        <ArrowLeft size={15} />
        Orqaga
      </button>
      <h1 className="mb-5 text-2xl font-bold text-ink">Maqolani tahrirlash</h1>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sarlavha"
          className="flex-1 rounded-lg border border-line bg-page px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className="w-24 rounded-lg border border-line bg-page px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
        <label className="flex items-center gap-2 text-sm text-soft">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Chop etilgan
        </label>
      </div>

      <MarkdownEditor value={content} onChange={setContent} />

      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || !title}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <Save size={17} />
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
        <button
          onClick={remove}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-soft transition hover:border-red-300 hover:text-red-500"
        >
          <Trash2 size={16} />
          O'chirish
        </button>
      </div>
    </div>
  );
}
