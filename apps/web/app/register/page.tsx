"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { register, loginWithGoogle, isLoggedIn } from "@/lib/auth";

function RegisterInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/kurslar";

  useEffect(() => {
    if (isLoggedIn()) router.replace(next);
  }, [next, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await register(email, password, name);
      if (!r.ok) {
        router.push(`/verify-email?email=${encodeURIComponent(r.email)}&next=${encodeURIComponent(next)}`);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 font-sans">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent text-white">
          <GraduationCap size={24} />
        </span>
        <h1 className="text-2xl font-bold text-ink">Ro'yxatdan o'tish</h1>
        <p className="mt-1 text-sm text-soft">
          Progress, bookmark va eslatmalarni saqlash uchun
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-3 rounded-2xl border border-line bg-page p-6 shadow-card"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ism"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parol (kamida 6 belgi)"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 pr-10 text-ink outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Parolni yashirish" : "Parolni ko'rsatish"}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md text-soft transition hover:text-ink"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "..." : "Ro'yxatdan o'tish"}
        </button>
      </form>

      <div className="mt-3">
        <div className="relative my-4 flex items-center">
          <div className="flex-1 border-t border-line" />
          <span className="mx-3 text-xs text-soft">yoki</span>
          <div className="flex-1 border-t border-line" />
        </div>
        <button
          onClick={loginWithGoogle}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-page py-2.5 text-sm font-medium text-ink transition hover:bg-bg"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Google bilan kirish
        </button>
      </div>

      <Link
        href="/login"
        className="mt-4 text-center text-sm text-soft hover:text-accent"
      >
        Hisobingiz bormi? Kiring
      </Link>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center font-sans text-soft">Yuklanmoqda...</p>}>
      <RegisterInner />
    </Suspense>
  );
}
