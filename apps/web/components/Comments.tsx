"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Trash2, Send, Heart, Reply } from "lucide-react";
import { getUser } from "@/lib/auth";
import {
  getComments,
  postComment,
  likeComment,
  deleteComment,
  type CommentItem,
} from "@/lib/engage-api";
import { GrammarCheck } from "@/components/GrammarCheck";

/** @mention'larni ajratib ko'rsatish (28-vazifa). */
function renderBody(body: string) {
  const parts = body.split(/(@[\p{L}\d_]+)/u);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span key={i} className="font-medium text-accent">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

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

  function count(list: CommentItem[]): number {
    return list.reduce((n, c) => n + 1 + count(c.replies), 0);
  }

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

  return (
    <section className="mt-12 border-t border-line pt-8 font-sans">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-ink">
        <MessageSquare size={18} className="text-accent" />
        Izohlar ({count(items)})
      </h2>

      {user ? (
        <form onSubmit={submit} className="mb-6">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Fikringizni yozing... (@ism bilan eslatishingiz mumkin)"
            className="h-24 w-full resize-y rounded-xl border border-line bg-page p-3 text-sm text-ink outline-none focus:border-accent"
          />
          <GrammarCheck text={body} onApply={setBody} />
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
          <Link href="/login" className="font-semibold text-accent">kiring</Link>.
        </p>
      )}

      <ul className="space-y-4">
        {items.map((c) => (
          <CommentCard
            key={c.id}
            c={c}
            articleId={articleId}
            currentUser={user}
            onChange={load}
          />
        ))}
        {items.length === 0 && (
          <li className="text-sm text-soft">Hozircha izoh yo'q. Birinchi bo'ling!</li>
        )}
      </ul>
    </section>
  );
}

function CommentCard({
  c,
  articleId,
  currentUser,
  onChange,
  depth = 0,
}: {
  c: CommentItem;
  articleId: string;
  currentUser: { id: string; role: string } | null;
  onChange: () => void;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [liked, setLiked] = useState(c.likedByMe);
  const [likeCount, setLikeCount] = useState(c.likeCount);
  const [busy, setBusy] = useState(false);

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
  }

  async function toggleLike() {
    if (!currentUser) return;
    // Optimistik
    setLiked((v) => !v);
    setLikeCount((n) => n + (liked ? -1 : 1));
    try {
      const r = await likeComment(c.id);
      setLiked(r.liked);
    } catch {
      setLiked((v) => !v);
      setLikeCount((n) => n + (liked ? 1 : -1));
    }
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await postComment(articleId, reply.trim(), c.id);
      setReply("");
      setReplying(false);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await deleteComment(c.id);
    onChange();
  }

  return (
    <li className={depth > 0 ? "ml-6 border-l border-line pl-4" : "rounded-xl border border-line bg-page p-4"}>
      <div className="mb-1 flex items-center gap-2 text-sm">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
          {c.author.charAt(0).toUpperCase()}
        </span>
        <span className="font-semibold text-ink">{c.author}</span>
        <span className="text-xs text-soft">{fmt(c.createdAt)}</span>
        {currentUser && (currentUser.id === c.userId || currentUser.role === "admin") && (
          <button onClick={remove} className="ml-auto text-soft hover:text-red-500" title="O'chirish">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm text-ink">{renderBody(c.body)}</p>

      <div className="mt-2 flex items-center gap-4 text-xs">
        <button
          onClick={toggleLike}
          disabled={!currentUser}
          className={`inline-flex items-center gap-1 transition ${liked ? "text-rose-500" : "text-soft hover:text-rose-500"} disabled:opacity-50`}
        >
          <Heart size={13} fill={liked ? "currentColor" : "none"} /> {likeCount}
        </button>
        {currentUser && depth === 0 && (
          <button
            onClick={() => setReplying((v) => !v)}
            className="inline-flex items-center gap-1 text-soft hover:text-accent"
          >
            <Reply size={13} /> Javob
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Javobingiz..."
            className="h-16 w-full resize-y rounded-lg border border-line bg-bg p-2 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            onClick={sendReply}
            disabled={busy || !reply.trim()}
            className="mt-1 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Yuborish
          </button>
        </div>
      )}

      {c.replies.length > 0 && (
        <ul className="mt-3 space-y-3">
          {c.replies.map((r) => (
            <CommentCard
              key={r.id}
              c={r}
              articleId={articleId}
              currentUser={currentUser}
              onChange={onChange}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
