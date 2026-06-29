"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  CircleCheck,
  Bookmark,
  BookmarkCheck,
  StickyNote,
  Save,
} from "lucide-react";
import {
  isLoggedIn,
  getState,
  markRead,
  unmarkRead,
  addBookmark,
  removeBookmark,
  getNote,
  saveNote,
} from "@/lib/me-api";

export function ArticleActions({ articleId }: { articleId: string }) {
  const [mounted, setMounted] = useState(false);
  const [logged, setLogged] = useState(false);
  const [read, setRead] = useState(false);
  const [marked, setMarked] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
    const l = isLoggedIn();
    setLogged(l);
    if (l) {
      getState()
        .then((s) => {
          setRead(s.completed.includes(articleId));
          setMarked(s.bookmarked.includes(articleId));
        })
        .catch(() => {});
      getNote(articleId)
        .then((n) => n && setNote(n.body))
        .catch(() => {});
    }
  }, [articleId]);

  async function toggleRead() {
    const next = !read;
    setRead(next);
    try {
      next ? await markRead(articleId) : await unmarkRead(articleId);
    } catch {
      setRead(!next);
    }
  }
  async function toggleMark() {
    const next = !marked;
    setMarked(next);
    try {
      next ? await addBookmark(articleId) : await removeBookmark(articleId);
    } catch {
      setMarked(!next);
    }
  }
  async function persistNote() {
    await saveNote(articleId, note);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!mounted) return <div className="mb-6 h-10" />;

  if (!logged) {
    return (
      <div className="mb-6 rounded-xl border border-line bg-bg px-4 py-2.5 font-sans text-sm text-soft">
        <Link href="/login" className="font-semibold text-accent">
          Kiring
        </Link>{" "}
        — progressni belgilang, saqlang va eslatma yozing.
      </div>
    );
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-sans text-sm transition";

  return (
    <div className="mb-6 font-sans">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={toggleRead}
          className={
            btn +
            (read
              ? " border-green-500/40 bg-green-500/10 text-green-600"
              : " border-line text-soft hover:text-ink")
          }
        >
          {read ? <CircleCheck size={15} /> : <Check size={15} />}
          {read ? "O'qildi" : "O'qildi deb belgilash"}
        </button>
        <button
          onClick={toggleMark}
          className={
            btn +
            (marked
              ? " border-accent/40 bg-accent/10 text-accent"
              : " border-line text-soft hover:text-ink")
          }
        >
          {marked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          {marked ? "Saqlangan" : "Saqlash"}
        </button>
        <button
          onClick={() => setShowNotes((v) => !v)}
          className={
            btn +
            (showNotes
              ? " border-accent/40 text-accent"
              : " border-line text-soft hover:text-ink")
          }
        >
          <StickyNote size={15} />
          Eslatma{note ? " ·" : ""}
        </button>
      </div>

      {showNotes && (
        <div className="mt-3 rounded-xl border border-line bg-page p-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Shu maqola haqida shaxsiy eslatmangiz..."
            className="h-28 w-full resize-y bg-transparent text-sm text-ink outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={persistNote}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              <Save size={14} />
              Saqlash
            </button>
            {saved && <span className="text-sm text-green-600">Saqlandi</span>}
          </div>
        </div>
      )}
    </div>
  );
}
