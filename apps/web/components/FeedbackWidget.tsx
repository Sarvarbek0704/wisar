"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  MessageSquarePlus, X, ThumbsUp, ThumbsDown, Lightbulb, Bug, Plus, Send, Loader2, CheckCircle2,
} from "lucide-react";
import { submitFeedback } from "@/lib/feedback-api";
import { isLoggedIn, getUser } from "@/lib/auth";

const OPEN_EVENT = "wisar:open-feedback";

/** Feedback modalini istalgan joydan ochish (TopBar, sidebar va h.k.). */
export function openFeedback() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

/** "Fikr bildirish" trigger tugmasi — TopBar (yoki boshqa malum joy) uchun. */
export function FeedbackButton({ className }: { className?: string }) {
  return (
    <button
      onClick={openFeedback}
      title="Fikr bildirish"
      aria-label="Fikr bildirish"
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5 hover:text-accent"
      }
    >
      <MessageSquarePlus size={16} />
      <span className="hidden md:inline">Fikr</span>
    </button>
  );
}

const CATS = [
  { key: "like",       label: "Yoqdi",         icon: ThumbsUp },
  { key: "dislike",    label: "Yoqmadi",        icon: ThumbsDown },
  { key: "suggestion", label: "Taklif",         icon: Lightbulb },
  { key: "bug",        label: "Xato",           icon: Bug },
  { key: "feature",    label: "Qo'shish kerak", icon: Plus },
];

/**
 * Feedback modali — DOIM ekranda turmaydi. Faqat `openFeedback()` chaqirilganda
 * (TopBar'dagi "Fikr bildirish" tugmasi) markazda ochiladi.
 */
export function FeedbackWidget() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [logged, setLogged] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const onOpen = () => {
      const l = isLoggedIn();
      setLogged(l);
      setUserName(l ? getUser()?.name ?? getUser()?.email ?? null : null);
      setDone(false);
      setErr("");
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Esc bilan yopish
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setTimeout(() => { setDone(false); setErr(""); }, 200);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (message.trim().length < 2) { setErr("Iltimos, fikringizni yozing."); return; }
    setLoading(true);
    try {
      await submitFeedback({
        category: cat,
        message: message.trim(),
        name: logged ? undefined : name.trim() || undefined,
        email: logged ? undefined : email.trim() || undefined,
        page: pathname,
      });
      setDone(true);
      setMessage("");
    } catch (e) {
      setErr((e as Error).message || "Yuborishda xato");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || !open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 font-sans"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-page shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-accent/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={17} className="text-accent" />
            <span className="text-sm font-semibold text-ink">Fikr bildirish</span>
          </div>
          <button onClick={close} className="text-soft transition hover:text-ink" aria-label="Yopish">
            <X size={17} />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 size={44} className="mx-auto mb-3 text-emerald-500" />
            <p className="font-semibold text-ink">Rahmat!</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-soft">
              Fikringiz yuborildi. Har bir taklif platformani yaxshilashga yordam beradi.
            </p>
            <button
              onClick={close}
              className="mt-5 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Yopish
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="p-5">
            <p className="mb-2 text-xs font-medium text-soft">Turini tanlang:</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {CATS.map((c) => {
                const active = cat === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCat(c.key)}
                    className={
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition " +
                      (active
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line text-soft hover:text-ink")
                    }
                  >
                    <c.icon size={12} /> {c.label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Fikringiz, taklifingiz yoki yoqmagan narsani yozing..."
              rows={5}
              autoFocus
              className="w-full resize-y rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />

            {logged ? (
              <p className="mt-2 text-xs text-soft">
                Sifatida: <span className="font-medium text-ink">{userName || "hisobingiz"}</span>
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ismingiz (ixtiyoriy)"
                  className="rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (ixtiyoriy)"
                  className="rounded-lg border border-line bg-bg px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
              </div>
            )}

            {err && <p className="mt-2 text-xs text-red-500">{err}</p>}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-soft transition hover:text-ink"
              >
                Bekor
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {loading ? "Yuborilmoqda..." : "Yuborish"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
