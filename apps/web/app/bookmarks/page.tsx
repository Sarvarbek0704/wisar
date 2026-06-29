"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Clock, ChevronRight } from "lucide-react";
import { isLoggedIn, getBookmarks, type BookmarkItem } from "@/lib/me-api";

export default function BookmarksPage() {
  const [mounted, setMounted] = useState(false);
  const [logged, setLogged] = useState(false);
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const l = isLoggedIn();
    setLogged(l);
    if (l) {
      getBookmarks()
        .then(setItems)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-page px-4 py-10 font-sans sm:px-6">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-ink">
        <Bookmark size={22} className="text-accent" />
        Saqlanganlar
      </h1>

      {!logged && (
        <p className="text-soft">
          Saqlangan maqolalarni ko'rish uchun{" "}
          <Link href="/login?next=/bookmarks" className="text-accent">
            kiring
          </Link>
          .
        </p>
      )}

      {logged && loading && <p className="text-soft">Yuklanmoqda...</p>}

      {logged && !loading && items.length === 0 && (
        <p className="text-soft">
          Hozircha saqlangan maqola yo'q. Maqolada "Saqlash" tugmasini bosing.
        </p>
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-page">
        {items.map((b, i) => (
          <li key={i}>
            <Link
              href={`/${b.topicSlug}/${b.sectionSlug}/${b.slug}`}
              className="group flex items-center gap-3 px-4 py-3 transition hover:bg-bg"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] uppercase tracking-wide text-soft">
                  {b.topicTitle} · {b.sectionTitle}
                </span>
                <span className="block truncate font-medium text-ink group-hover:text-accent">
                  {b.title}
                </span>
              </span>
              <span className="flex flex-none items-center gap-1 text-xs text-soft">
                <Clock size={13} />
                {b.readingTime} daq
              </span>
              <ChevronRight
                size={16}
                className="flex-none text-soft group-hover:text-accent"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
