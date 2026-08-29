"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck, Loader2 } from "lucide-react";
import { verifyEmail, resendVerification } from "@/lib/auth";

function VerifyInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = sp.get("email") || "";
  const next = sp.get("next") || "/kurslar";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await verifyEmail(email, code.trim());
      // Yangi ro'yxatdan o'tgan foydalanuvchi — avval daraja aniqlash testiga.
      const onboarded = localStorage.getItem("wisar-onboarded") === "true";
      router.push(!onboarded && !sp.get("next") ? "/onboarding" : next);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setErr("");
    setResent(false);
    try {
      await resendVerification(email);
      setResent(true);
      setCooldown(30);
    } catch {
      setErr("Qayta yuborishda xato");
    }
  }

  if (!email) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center font-sans">
        <p className="text-soft">Email ko'rsatilmagan.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 font-sans">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent text-white">
          <MailCheck size={24} />
        </span>
        <h1 className="text-2xl font-bold text-ink">Emailni tasdiqlang</h1>
        <p className="mt-1 text-sm text-soft">
          <span className="font-medium text-ink">{email}</span> manziliga 6 xonali kod yubordik.
          Kodni kiriting.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-page p-6 shadow-card">
        <input
          ref={inputRef}
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          className="w-full rounded-lg border border-line bg-bg px-3 py-3 text-center text-2xl font-bold tracking-[0.4em] text-ink outline-none focus:border-accent"
        />
        {err && <p className="text-sm text-red-500">{err}</p>}
        {resent && <p className="text-sm text-emerald-600">Kod qayta yuborildi!</p>}
        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : null}
          {loading ? "Tekshirilmoqda..." : "Tasdiqlash"}
        </button>
      </form>

      <button
        onClick={resend}
        disabled={cooldown > 0}
        className="mt-4 text-center text-sm text-soft transition hover:text-accent disabled:opacity-50"
      >
        {cooldown > 0 ? `Qayta yuborish (${cooldown}s)` : "Kod kelmadimi? Qayta yuborish"}
      </button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center font-sans text-soft">Yuklanmoqda...</p>}>
      <VerifyInner />
    </Suspense>
  );
}
