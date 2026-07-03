"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Search, MessageSquare } from "lucide-react";
import { adminListComments, adminDeleteComment, type AdminComment } from "@/lib/admin-api";
import { toast, confirmDialog } from "@/lib/ui";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(search = "", skip = 0) {
    setLoading(true);
    try {
      const res = await adminListComments(search, 50, skip);
      setComments((prev) => (skip === 0 ? res.items : [...prev, ...res.items]));
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(c: AdminComment) {
    if (!(await confirmDialog("Bu izohni o'chirasizmi?"))) return;
    await adminDeleteComment(c.id);
    setComments((p) => p.filter((x) => x.id !== c.id));
    toast("Izoh o'chirildi");
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Izohlar</h1>
          <p className="text-sm text-soft">{total} ta izoh · moderatsiya</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-page px-3 py-2">
          <Search size={15} className="flex-none text-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder="Qidirish..."
            className="w-full bg-transparent text-sm text-ink outline-none sm:w-40"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-soft">Yuklanmoqda...</p>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-line bg-page p-12 text-center">
          <MessageSquare size={36} className="mx-auto mb-3 text-soft/40" />
          <p className="text-soft">Izoh topilmadi.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="group flex items-start gap-3 rounded-xl border border-line bg-page p-4">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-accent text-sm font-bold text-white">
                {(c.user.name || c.user.email).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-soft">
                  <span className="font-medium text-ink">{c.user.name || c.user.email}</span>
                  <span>·</span>
                  <Link href={`/dasturlash`} className="truncate text-accent hover:underline">
                    {c.article.title}
                  </Link>
                  <span className="ml-auto">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-ink">{c.body}</p>
              </div>
              <button
                onClick={() => remove(c)}
                title="O'chirish"
                className="grid h-8 w-8 flex-none place-items-center rounded-lg text-soft opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && comments.length < total && (
        <button
          onClick={() => load(q, comments.length)}
          className="mt-4 w-full rounded-lg border border-line py-2.5 text-sm font-medium text-soft hover:text-accent"
        >
          Ko'proq yuklash ({comments.length}/{total})
        </button>
      )}
    </div>
  );
}
