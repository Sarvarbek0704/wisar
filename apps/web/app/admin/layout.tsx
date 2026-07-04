"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, FileText, Users, MessageSquare,
  Ticket, LogOut, ExternalLink, ShieldCheck, MessageSquarePlus,
} from "lucide-react";
import { getUser, logout, type AuthUser } from "@/lib/auth";

const NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/admin/content", icon: FileText, label: "Kontent" },
  { href: "/admin/users", icon: Users, label: "Foydalanuvchilar" },
  { href: "/admin/comments", icon: MessageSquare, label: "Izohlar" },
  { href: "/admin/feedback", icon: MessageSquarePlus, label: "Fikrlar" },
  { href: "/admin/invites", icon: Ticket, label: "Takliflar" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    const u = getUser();
    if (!u || u.role !== "admin") {
      router.replace("/admin/login");
      return;
    }
    setUser(u);
    setReady(true);
  }, [pathname, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (!ready) {
    return <div className="p-16 text-center font-sans text-soft">Yuklanmoqda...</div>;
  }

  function active(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen bg-bg font-sans">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-page lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-white">
            <ShieldCheck size={17} />
          </span>
          <span className="font-bold text-ink">Admin</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active(item.href, item.exact)
                  ? "bg-accent/10 text-accent"
                  : "text-ink/70 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              <item.icon size={16} /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-soft transition hover:bg-ink/5 hover:text-ink"
          >
            <ExternalLink size={15} /> Saytni ko'rish
          </Link>
          <button
            onClick={() => { logout(); router.replace("/admin/login"); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-500 transition hover:bg-rose-500/10"
          >
            <LogOut size={15} /> Chiqish
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-56">
        {/* Mobile top nav */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-line bg-page px-3 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                active(item.href, item.exact) ? "bg-accent/10 text-accent" : "text-soft"
              }`}
            >
              <item.icon size={14} /> {item.label}
            </Link>
          ))}
        </div>
        {/* Top bar */}
        <div className="hidden h-14 items-center border-b border-line bg-page px-6 lg:flex">
          <span className="ml-auto text-sm text-soft">{user?.email}</span>
        </div>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
