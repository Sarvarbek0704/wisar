"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { TopBar } from "./TopBar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";
import { AnimatePresence, motion } from "framer-motion";

/* Sidebarni ko'rsatmaydigan yo'llar (umumiy sahifalar) */
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/auth/",
  "/join/",
];

/* Landing page (/) uchun ham sidebar yo'q */
function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/* Kontent o'qish sahifalariga sidebar kerak emas (to'liq kenglik) */
const CONTENT_PREFIXES = ["/certificate/", "/profile/"];
function isContentPath(pathname: string) {
  return CONTENT_PREFIXES.some((p) => pathname.startsWith(p));
}

/* Admin — butunlay alohida: o'z layout/topbar'i bor, AppShell chrome'siz */
function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/* Login talab qiladigan shaxsiy sahifalar — kirmagan odam yo'naltiriladi */
const PROTECTED_PREFIXES = [
  "/me",
  "/bookmarks",
  "/planner",
  "/flashcards",
  "/ielts",
  "/onboarding",
  "/certificate",
];
function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [auth, setAuth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setAuth(isLoggedIn());
    setMounted(true);
    try {
      setCollapsed(localStorage.getItem("wisar-sidebar") === "collapsed");
    } catch {}
  }, [pathname]);

  // Guard: login talab qiladigan sahifaga kirmagan odam → login'ga
  const needAuth = mounted && !auth && isProtectedPath(pathname);
  useEffect(() => {
    if (needAuth) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [needAuth, pathname, router]);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("wisar-sidebar", next ? "collapsed" : "expanded"); } catch {}
  }

  const showSidebar = mounted && auth && !isPublicPath(pathname) && !isContentPath(pathname);

  /* Admin sahifalar — o'z layout'i bor, AppShell hech narsa qo'shmaydi */
  if (isAdminPath(pathname)) {
    return <>{children}</>;
  }

  /* Himoyalangan sahifa + kirilmagan → yo'naltirilguncha bo'sh ko'rsatamiz */
  if (needAuth) {
    return (
      <>
        <TopBar />
        <div className="grid min-h-[60vh] place-items-center font-sans text-soft">
          Yo'naltirilmoqda…
        </div>
      </>
    );
  }

  if (!mounted) {
    /* SSR/hydration — ko'rsatmasdan chiqar */
    return (
      <>
        <TopBar />
        <main>{children}</main>
      </>
    );
  }

  if (!showSidebar) {
    /* Landing, auth, content pages — faqat TopBar */
    return (
      <>
        <TopBar />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: .22, ease: [.4, 0, .2, 1] }}
            className="page-wrapper"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </>
    );
  }

  /* App sahifalar — Sidebar + TopBar + BottomNav (mobile) */
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:block">
        <AppSidebar collapsed={collapsed} onToggle={toggleSidebar} />
      </div>

      {/* Main area */}
      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}>
        <TopBar inApp />
        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .15 }}
            className="flex-1 pb-20 lg:pb-0"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Bottom nav — mobile */}
      <BottomNav />
    </div>
  );
}
