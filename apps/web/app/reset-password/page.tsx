"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle } from "lucide-react";
import { resetPassword } from "@/lib/auth";

function ResetPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center font-sans">
        <p className="text-soft">
          Noto'g'ri havola.{" "}
          <Link href="/forgot-password" className="text-accent">
            Qayta so'rang
          </Link>
          .
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErr("Parollar mos kelmadi.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
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
          <Lock size={22} />
        </span>
        <h1 className="text-2xl font-bold text-ink">Yangi parol</h1>
        <p className="mt-1 text-sm text-soft">Kamida 6 belgi kiriting.</p>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle className="text-emerald-600" size={40} />
          <p className="font-semibold text-emerald-800">Parol o'zgartirildi!</p>
          <p className="text-sm text-emerald-700">Kirish sahifasiga o'tilmoqda...</p>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-line bg-page p-6 shadow-card"
        >
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Yangi parol (kamida 6 belgi)"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Parolni qaytaring"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent"
          />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Saqlanmoqda..." : "Parolni o'zgartirish"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center font-sans text-soft">Yuklanmoqda...</p>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
