"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageSquarePlus, Trash2, Check, Mail, User as UserIcon, Inbox,
  ThumbsUp, ThumbsDown, Lightbulb, Bug, Plus, MessageCircle,
} from "lucide-react";
import {
  adminListFeedback, adminMarkFeedbackRead, adminDeleteFeedback, type FeedbackItem,
} from "@/lib/feedback-api";
import { toast, confirmDialog } from "@/lib/ui";

const CAT: Record<string, { label: string; icon: typeof ThumbsUp; cls: string }> = {
  like:       { label: "Yoqdi",         icon: ThumbsUp,   cls: "bg-emerald-500/15 text-emerald-600" },
  dislike:    { label: "Yoqmadi",        icon: ThumbsDown, cls: "bg-rose-500/15 text-rose-600" },
  suggestion: { label: "Taklif",         icon: Lightbulb,  cls: "bg-amber-500/15 text-amber-600" },
  bug:        { label: "Xato",           icon: Bug,        cls: "bg-red-500/15 text-red-600" },
  feature:    { label: "Qo'shish kerak", icon: Plus,       cls: "bg-accent/15 text-accent" },
  other:      { label: "Boshqa",         icon: MessageCircle, cls: "bg-soft/15 text-soft" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("uz", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f: "all" | "unread", skip = 0) => {
    setLoading(true);
    try {
      const res = await adminListFeedback(f, 30, skip);
      setItems((prev) => (skip === 0 ? res.items : [...prev, ...res.items]));
      setTotal(res.total);
      setUnread(res.unread);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  async function toggleRead(f: FeedbackItem) {
    const next = !f.read;
    setItems((p) => p.map((x) => (x.id === f.id ? { ...x, read: next } : x)));
    setUnread((u) => u + (next ? -1 : 1));
    try { await adminMarkFeedbackRead(f.id, next); } catch { load(filter); }
  }

  async function remove(f: FeedbackItem) {
    if (!(await confirmDialog("Bu fikrni o'chirasizmi?"))) return;
    await adminDeleteFeedback(f.id);
    setItems((p) => p.filter((x) => x.id !== f.id));
    setTotal((t) => t - 1);
    if (!f.read) setUnread((u) => u - 1);
    toast("O'chirildi");
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <MessageSquarePlus size={22} className="text-accent" /> Fikr-mulohazalar
          </h1>
          <p className="text-sm text-soft">
            {total} ta fikr · {unread > 0 ? <span className="font-semibold text-accent">{unread} o'qilmagan</span> : "hammasi o'qilgan"}
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-line bg-page p-0.5 text-sm">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "rounded-md px-3 py-1.5 font-medium transition " +
                (filter === f ? "bg-accent text-white" : "text-soft hover:text-ink")
              }
            >
              {f === "all" ? "Barchasi" : `O'qilmagan${unread ? ` (${unread})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <p className="text-soft">Yuklanmoqda...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-page p-12 text-center">
          <Inbox size={36} className="mx-auto mb-3 text-soft/40" />
          <p className="text-soft">Hali fikr yo'q.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((f) => {
            const c = CAT[f.category] ?? CAT.other;
            const who = f.name || f.email || "Mehmon";
            return (
              <div
                key={f.id}
                className={
                  "rounded-2xl border p-4 transition " +
                  (f.read ? "border-line bg-page" : "border-accent/30 bg-accent/[0.03]")
                }
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${c.cls}`}>
                    <c.icon size={12} /> {c.label}
                  </span>
                  {!f.read && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-white">Yangi</span>
                  )}
                  <span className="ml-auto text-xs text-soft">{fmt(f.createdAt)}</span>
                </div>

                <p className="whitespace-pre-wrap text-sm text-ink">{f.message}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-xs text-soft">
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon size={13} className="text-accent" />
                    <span className="font-medium text-ink">{who}</span>
                    {f.userId && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">ro'yxatdan o'tgan</span>}
                    {!f.userId && <span className="text-soft">(mehmon)</span>}
                  </span>
                  {f.email && (
                    <a href={`mailto:${f.email}`} className="inline-flex items-center gap-1 hover:text-accent">
                      <Mail size={13} /> {f.email}
                    </a>
                  )}
                  {f.page && <span className="truncate">📍 {f.page}</span>}

                  <span className="ml-auto flex items-center gap-1.5">
                    <button
                      onClick={() => toggleRead(f)}
                      className={
                        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition " +
                        (f.read
                          ? "border-line text-soft hover:text-ink"
                          : "border-accent/40 text-accent hover:bg-accent/10")
                      }
                    >
                      <Check size={13} /> {f.read ? "O'qilgan" : "O'qildi"}
                    </button>
                    <button
                      onClick={() => remove(f)}
                      title="O'chirish"
                      className="grid h-7 w-7 place-items-center rounded-lg border border-line text-soft hover:text-rose-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && items.length < total && (
        <button
          onClick={() => load(filter, items.length)}
          className="mt-4 w-full rounded-lg border border-line py-2.5 text-sm font-medium text-soft hover:text-accent"
        >
          Ko'proq yuklash ({items.length}/{total})
        </button>
      )}
    </div>
  );
}
