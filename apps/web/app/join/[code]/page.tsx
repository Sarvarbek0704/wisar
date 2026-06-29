"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { UserPlus, CheckCircle, XCircle } from "lucide-react";
import { register } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type InviteStatus = "checking" | "valid" | "invalid";

export default function JoinPage() {
  const router = useRouter();
  const { code } = useParams<{ code: string }>();

  const [status, setStatus] = useState<InviteStatus>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/invites/${code}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => setStatus("valid"))
      .catch(() => setStatus("invalid"));
  }, [code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register(email, password, name, code);
      router.push("/me");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-sans">
        <p className="text-soft">Tekshirilmoqda...</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center font-sans">
        <XCircle size={48} className="mx-auto mb-4 text-rose-400" />
        <h1 className="mb-2 text-xl font-bold text-ink">Taklif noto'g'ri yoki muddati o'tgan</h1>
        <p className="text-sm text-soft">
          To'g'ri havola uchun taklif yuborgan odamga murojaat qiling.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 font-sans">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent text-white">
          <UserPlus size={22} />
        </span>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <CheckCircle size={12} /> Taklif kodi tasdiqlandi
        </div>
        <h1 className="mt-3 text-2xl font-bold text-ink">Ro'yxatdan o'tish</h1>
        <p className="mt-1 text-sm text-soft">Taklif kodi: <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-accent">{code}</code></p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-3 rounded-2xl border border-line bg-page p-6 shadow-card"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ismingiz (ixtiyoriy)"
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
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Parol (kamida 6 belgi)"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "..." : "Hisob yaratish"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-soft">
        Hisobingiz bormi?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Kiring
        </Link>
      </p>
    </div>
  );
}
