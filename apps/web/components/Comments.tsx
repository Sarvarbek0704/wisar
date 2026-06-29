"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { getUser } from "@/lib/auth";
import {
  getComments,
  postComment,
  deleteComment,
  type CommentItem,
} from "@/lib/engage-api";

export function Comments({ articleId }: { articleId: string }) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const user = mounted ? getUser() : null;

  async function load() {
    setItems(await getComments(articleId));
  }
  useEffect(() => {
    setMounted(true);
    load();
  }, [articleId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    try {
      await postComment(articleId, body.trim());
      setBody("");
      await load();
    } finally {
      setPosting(false);
    }
  }
  async function remove(id: string) {
    await deleteComment(id);
    await load();
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("uz", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <section className="mt-12 border-t border-line pt-8 font-sans">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-ink">
        <MessageSquare size={18} className="text-accent" />
        Izohlar ({items.length})
      </h2>

      {user ? (
        <form onSubmit={submit} className="mb-6">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Fikringizni yozing..."
            className="h-24 w-full resize-y rounded-xl border border-line bg-page p-3 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            <Send size={14} />
            Yuborish
          </button>
        </form>
      ) : (
        <p className="mb-6 rounded-xl border border-line bg-bg px-4 py-3 text-sm text-soft">
          Izoh yozish uchun{" "}
          <Link href="/login" className="font-semibold text-accent">
            kiring
          </Link>
          .
        </p>
      )}

      <ul className="space-y-4">
        {items.map((c) => (
          <li key={c.id} className="rounded-xl border border-line bg-page p-4">
            <div className="mb-1 flex items-center gap-2 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                {c.author.charAt(0).toUpperCase()}
              </span>
              <span className="font-semibold text-ink">{c.author}</span>
              <span className="text-xs text-soft">{fmt(c.createdAt)}</span>
              {user && (user.id === c.userId || user.role === "admin") && (
                <button
                  onClick={() => remove(c.id)}
                  className="ml-auto text-soft hover:text-red-500"
                  title="O'chirish"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink">{c.body}</p>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-soft">Hozircha izoh yo'q. Birinchi bo'ling!</li>
        )}
      </ul>
    </section>
  );
}
