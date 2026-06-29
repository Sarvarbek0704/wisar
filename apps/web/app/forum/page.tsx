"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessagesSquare, Plus, CircleCheck, MessageCircle } from "lucide-react";
import { getUser } from "@/lib/auth";
import { listThreads, createThread, type ForumThreadItem } from "@/lib/forum-api";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/lib/ui";

const PAGE = 20;

export default function ForumPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ForumThreadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const user = mounted ? getUser() : null;

  async function load(skip = 0) {
    try {
      const res = await listThreads(PAGE, skip);
      setItems((prev) => (skip === 0 ? res.items : [...prev, ...res.items]));
      setTotal(res.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setMounted(true);
    load(0);
  }, []);

  async function submit() {
    if (title.trim().length < 5) return;
    setBusy(true);
    try {
      await createThread(title.trim(), body.trim());
      setTitle("");
      setBody("");
      setShowForm(false);
      toast("Savol joylandi", "success");
      await load(0);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short" });
  }

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-page px-4 py-10 font-sans sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <MessagesSquare size={22} className="text-accent" />
          Savol-javob
        </h1>
        {user ? (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus size={15} /> Savol berish
          </button>
        ) : (
          <Link href="/login?next=/forum" className="text-sm text-accent">
            Savol berish uchun kiring
          </Link>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-line bg-page p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Savol sarlavhasi (kamida 5 belgi)"
            className="mb-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Batafsil yozing (ixtiyoriy)..."
            className="h-24 w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={busy || title.trim().length < 5}
            className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Joylash
          </button>
        </div>
      )}

      {loading && <p className="text-soft">Yuklanmoqda...</p>}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title="Hali savollar yo'q"
          description="Birinchi savolni bering — jamoa javob beradi."
        />
      )}

      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.id}>
            <Link
              href={`/forum/${t.id}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-page px-4 py-3 transition hover:border-accent/40"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  {t.solved && <CircleCheck size={14} className="flex-none text-success" />}
                  <span className="truncate">{t.title}</span>
                </span>
                <span className="block text-xs text-soft">
                  {t.author} · {fmt(t.createdAt)}
                </span>
              </span>
              <span className="flex flex-none items-center gap-1 text-xs text-soft">
                <MessageCircle size={13} /> {t.postCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {!loading && items.length < total && (
        <button
          onClick={() => load(items.length)}
          className="mt-4 w-full rounded-lg border border-line py-2.5 text-sm font-medium text-soft hover:text-accent"
        >
          Ko'proq yuklash ({items.length}/{total})
        </button>
      )}
    </div>
  );
}
