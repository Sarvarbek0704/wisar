"use client";

// Google OAuth callback sahifasi: /auth/google?token=xxx
// Backend GET /api/auth/google/callback → redirect shu sahifaga token bilan

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const TOKEN_KEY = "wisar-token";
const USER_KEY = "wisar-user";

function GoogleCallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const token = sp.get("token");
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
  }, [router, sp]);

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
