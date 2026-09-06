"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, LayoutDashboard, LogIn, LogOut, User } from "lucide-react";
import { getUser, logoutServer, type AuthUser } from "@/lib/auth";

export function UserMenu() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
  }, []);
  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  if (!mounted) return <div className="h-9 w-9" />;

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm text-soft transition hover:border-accent/40 hover:text-accent"
      >
        <LogIn size={16} />
        <span className="hidden sm:inline">Kirish</span>
      </Link>
    );
  }

  // Telefon bilan kirgan foydalanuvchida email bo'lmasligi mumkin.
  const initial = (user.name || user.email || "F").charAt(0).toUpperCase();
  const item =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-bg";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Foydalanuvchi menyusi"
        className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-bold text-white"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-line bg-page p-1.5 font-sans text-sm shadow-card">
          <div className="truncate px-3 py-2 text-xs text-soft">
            {user.email}
          </div>
          <Link href="/me" className={item + " text-ink"} onClick={() => setOpen(false)}>
            <User size={15} />
            Mening sahifam
          </Link>
          <Link href="/bookmarks" className={item + " text-ink"} onClick={() => setOpen(false)}>
            <Bookmark size={15} />
            Saqlanganlar
          </Link>
          {user.role === "admin" && (
            <Link href="/admin" className={item + " text-ink"} onClick={() => setOpen(false)}>
              <LayoutDashboard size={15} />
              Admin panel
            </Link>
          )}
          <button
            onClick={() => {
              void logoutServer();
              setUser(null);
              setOpen(false);
              router.refresh();
            }}
            className={item + " text-red-500"}
          >
            <LogOut size={15} />
            Chiqish
          </button>
        </div>
      )}
    </div>
  );
}
