"use client";

// Google OAuth callback sahifasi: /auth/google#token=xxx
// Backend GET /api/auth/google/callback → redirect shu sahifaga token bilan.
// Token FRAGMENT da keladi (query emas) — fragment serverga yuborilmaydi,
// shuning uchun u server loglariga va Referer sarlavhasiga tushmaydi.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

const TOKEN_KEY = "wisar-token";
const USER_KEY = "wisar-user";

function GoogleCallbackInner() {
  const router = useRouter();

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const token = new URLSearchParams(hash).get("token");
    // Tokenni manzil qatoridan darhol olib tashlaymiz (brauzer tarixida qolmasin).
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (!token) {
      router.replace("/login?error=google");
      return;
    }
    // JWT decode qilib user info olish (header.payload.sig)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const user = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || null,
        role: payload.role || "user",
      };
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      router.replace("/login?error=google");
      return;
    }
    router.replace("/me");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center font-sans">
      <p className="text-soft">Google orqali kirilmoqda...</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-soft">Yuklanmoqda...</p></div>}>
      <GoogleCallbackInner />
    </Suspense>
  );
}
