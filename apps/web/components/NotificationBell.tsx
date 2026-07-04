"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/notifications-api";

const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  return `${d} kun oldin`;
}

export function NotificationBell() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    if (!isLoggedIn()) return;
    getUnreadCount().then((r) => setCount(r.count)).catch(() => {});
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) return;
    refreshCount();
    const t = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(t);
  }, [refreshCount]);

  // Tashqariga bosilganda yopish
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const list = await listNotifications().catch(() => []);
      setItems(list);
    }
  }

  async function openItem(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id).catch(() => {});
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
      setCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function readAll() {
    await markAllNotificationsRead().catch(() => {});
    setItems((prev) => prev?.map((x) => ({ ...x, read: true })) ?? null);
    setCount(0);
  }

  if (!mounted || !isLoggedIn()) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Bildirishnomalar"
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-line bg-page shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-sm font-semibold text-ink">Bildirishnomalar</span>
            {count > 0 && (
              <button
                onClick={readAll}
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Check size={12} /> Hammasini o'qilgan
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items === null ? (
              <div className="px-3 py-6 text-center text-sm text-soft">Yuklanmoqda…</div>
            ) : items.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-soft">Hozircha bildirishnoma yo'q</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-line px-3 py-2.5 text-left transition-colors hover:bg-ink/5 ${
                    n.read ? "" : "bg-accent/5"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    {n.title}
                  </span>
                  {n.body && <span className="line-clamp-2 text-xs text-soft">{n.body}</span>}
                  <span className="text-[11px] text-soft/70">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
