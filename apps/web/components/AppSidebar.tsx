"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, CalendarDays,
  Layers, Sparkles, User, Brain, MessageCircle,
  Users, MessagesSquare,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { isLoggedIn } from "@/lib/auth";
import { getDueCount } from "@/lib/review-api";
import { useI18n } from "@/lib/i18n";

const NAV = [
  { href: "/me",         icon: LayoutDashboard, tkey: "nav.dashboard",  label: "Dashboard",   exact: true },
  { href: "/kurslar",    icon: BookOpen,         tkey: "nav.courses",    label: "Kurslar" },
  { href: "/review",     icon: Brain,            tkey: "nav.review",     label: "Takrorlash", badge: true },
  { href: "/planner",    icon: CalendarDays,     tkey: "nav.planner",    label: "Kunim" },
  { href: "/flashcards", icon: Layers,           tkey: "nav.flashcards", label: "Flashkartlar" },
  { href: "/practice",   icon: MessageCircle,    tkey: "nav.practice",   label: "Suhbat" },
  { href: "/ielts",      icon: Sparkles,         tkey: "nav.ielts",      label: "IELTS Coach" },
  { href: "/groups",     icon: Users,            tkey: "nav.groups",     label: "Guruhlar" },
  { href: "/forum",      icon: MessagesSquare,   tkey: "nav.forum",      label: "Forum" },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [due, setDue] = useState(0);

  // Takrorlash navbatidagi elementlar soni (3-vazifa badge)
  useEffect(() => {
    if (!isLoggedIn()) return;
    getDueCount()
      .then((d) => setDue(d.total))
      .catch(() => {});
  }, [pathname]);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-line bg-page transition-all duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      <div className="flex h-14 items-center border-b border-line px-3">
        {!collapsed && <Logo />}
        <button
          onClick={onToggle}
          className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-soft transition hover:bg-ink/5 hover:text-ink ${collapsed ? "mx-auto" : "ml-auto"}`}
          title={collapsed ? "Kengaytirish" : "Yopish"}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-0.5 px-2">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-ink/70 hover:bg-ink/5 hover:text-ink"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <span className="relative flex-shrink-0">
                <item.icon size={17} />
                {item.badge && due > 0 && collapsed && (
                  <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </span>
              {!collapsed && <span className="flex-1">{t(item.tkey)}</span>}
              {item.badge && due > 0 && !collapsed && (
                <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                  {due > 99 ? "99+" : due}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-line px-3 pt-3">
          <LanguageSwitcher />
        </div>
      )}
      <div className={`border-t border-line px-2 py-3 flex items-center ${collapsed ? "justify-center" : "justify-between px-3"}`}>
        {!collapsed && (
          <Link href="/me" className="flex items-center gap-2 text-xs text-soft hover:text-ink transition-colors">
            <User size={13} /> {t("nav.profile")}
          </Link>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}
