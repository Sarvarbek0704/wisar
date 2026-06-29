"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Send, Check } from "lucide-react";
import { getUser } from "@/lib/auth";
import {
  getThread,
  addPost,
  acceptPost,
  type ForumThreadDetail,
} from "@/lib/forum-api";
import { GrammarCheck } from "@/components/GrammarCheck";
import { toast } from "@/lib/ui";

export default function ForumThreadPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ForumThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const user = mounted ? getUser() : null;

  async function load() {
    try {
      setData(await getThread(id));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setMounted(true);
    load();
  }, [id]);

  async function submit() {
    if (body.trim().length < 2) return;
    setBusy(true);
    try {
      await addPost(id, body.trim());
      setBody("");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function accept(postId: string) {
    try {
      await acceptPost(postId);
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
  }

  if (loading) return <p className="mx-auto max-w-page px-4 py-16 text-center text-soft">Yuklanmoqda...</p>;
  if (!data)
    return (
      <div className="mx-auto max-w-page px-4 py-16 text-center font-sans">
        <p className="text-danger">Savol topilmadi</p>
        <Link href="/forum" className="mt-3 inline-block text-accent">← Forum</Link>
      </div>
    );

  const isOwner = user?.id === data.ownerId;

  return (
    <div className="mx-auto max-w-page px-4 py-10 font-sans sm:px-6">
      <Link href="/forum" className="mb-4 inline-flex items-center gap-1.5 text-sm text-soft hover:text-accent">
        <ArrowLeft size={15} /> Forum
      </Link>

      <article className="mb-6 rounded-2xl border border-line bg-page p-5">
        <h1 className="text-xl font-bold text-ink">{data.title}</h1>
        <p className="mt-1 text-xs text-soft">{data.author} · {fmt(data.createdAt)}</p>
        {data.body && <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{data.body}</p>}
      </article>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-soft">
        Javoblar ({data.posts.length})
      </h2>
      <ul className="space-y-3">
        {data.posts.map((p) => (
          <li
            key={p.id}
            className={`rounded-xl border p-4 ${
              p.accepted ? "border-success/40 bg-success/5" : "border-line bg-page"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                {p.author.charAt(0).toUpperCase()}
              </span>
              <span className="font-semibold text-ink">{p.author}</span>
              <span className="text-xs text-soft">{fmt(p.createdAt)}</span>
              {p.accepted && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-success">
                  <CircleCheck size={13} /> To'g'ri javob
                </span>
              )}
              {!p.accepted && isOwner && (
                <button
                  onClick={() => accept(p.id)}
                  className="ml-auto inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-soft hover:text-success"
                >
                  <Check size={12} /> To'g'ri deb belgilash
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink">{p.body}</p>
          </li>
        ))}
        {data.posts.length === 0 && <li className="text-sm text-soft">Hali javob yo'q. Birinchi bo'ling!</li>}
      </ul>

      {user ? (
        <div className="mt-6">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Javobingizni yozing..."
            className="h-24 w-full resize-y rounded-xl border border-line bg-page p-3 text-sm text-ink outline-none focus:border-accent"
          />
          <GrammarCheck text={body} onApply={setBody} />
          <button
            onClick={submit}
            disabled={busy || body.trim().length < 2}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Send size={14} /> Javob yuborish
          </button>
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-line bg-bg px-4 py-3 text-sm text-soft">
          Javob yozish uchun <Link href="/login" className="font-semibold text-accent">kiring</Link>.
        </p>
      )}
    </div>
  );
}
