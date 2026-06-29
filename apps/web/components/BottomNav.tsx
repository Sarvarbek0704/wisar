"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Layers, Sparkles, User } from "lucide-react";

const NAV = [
  { href: "/kurslar",    icon: BookOpen,     label: "Kurslar" },
  { href: "/planner",    icon: CalendarDays, label: "Kunim" },
  { href: "/flashcards", icon: Layers,       label: "Kartalar" },
  { href: "/ielts",      icon: Sparkles,     label: "IELTS" },
  { href: "/me",         icon: User,         label: "Profil" },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-line bg-page/95 backdrop-blur supports-[backdrop-filter]:bg-page/80 lg:hidden">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${active ? "active" : ""}`}
          >
            <item.icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
