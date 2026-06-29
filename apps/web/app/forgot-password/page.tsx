"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
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
          <Mail size={22} />
        </span>
        <h1 className="text-2xl font-bold text-ink">Parolni tiklash</h1>
        <p className="mt-1 text-sm text-soft">
          Email manzilingizni kiriting — tiklash havolasi yuboramiz.
        </p>
      </div>

      {sent ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <p className="font-semibold text-emerald-800">Email yuborildi!</p>
          <p className="mt-1 text-sm text-emerald-700">
            <b>{email}</b> manziliga tiklash havolasi yuborildi. Spam papkasini ham tekshiring.
          </p>
          <p className="mt-3 text-xs text-emerald-600">Havola 1 soat amal qiladi.</p>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-line bg-page p-6 shadow-card"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email manzilingiz"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent"
          />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Yuborilmoqda..." : "Havolani yuborish"}
          </button>
        </form>
      )}

      <Link
        href="/login"
        className="mt-5 inline-flex items-center justify-center gap-1.5 text-sm text-soft hover:text-accent"
      >
        <ArrowLeft size={14} /> Kirishga qaytish
      </Link>
    </div>
  );
}
