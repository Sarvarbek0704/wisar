"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Printer, Award, ArrowLeft } from "lucide-react";
import { getUser, isLoggedIn } from "@/lib/auth";
import Link from "next/link";

const LEVEL_INFO: Record<
  string,
  { label: string; desc: string; from: string; to: string; via?: string }
> = {
  a1: {
    label: "A1 Boshlang'ich",
    desc: "Asosiy so'zlar, oddiy iboralar va salomlashish",
    from: "#4f46e5",
    to: "#818cf8",
  },
  a2: {
    label: "A2 Elementar",
    desc: "Oddiy suhbat, tanish mavzularda matn",
    from: "#0284c7",
    to: "#38bdf8",
  },
  b1: {
    label: "B1 O'rta",
    desc: "Erkin muloqot, umumiy mavzularda tushunish",
    from: "#059669",
    to: "#34d399",
  },
  b2: {
    label: "B2 Yuqori o'rta",
    desc: "Murakkab mavzularda ravon nutq va yozish",
    from: "#d97706",
    to: "#fbbf24",
  },
  c1: {
    label: "C1 Ilg'or",
    desc: "Professional darajada ingliz tili",
    from: "#dc2626",
    to: "#f87171",
  },
  c2: {
    label: "C2 Ustoz",
    desc: "Ona tili darajasida bilim va ifoda",
    from: "#7c3aed",
    to: "#c084fc",
  },
};

export default function CertificatePage() {
  const { level } = useParams<{ level: string }>();
  const info = LEVEL_INFO[level?.toLowerCase()];
  const [mounted, setMounted] = useState(false);
  const user = mounted ? getUser() : null;

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (!info) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center font-sans">
        <p className="text-soft">
          Noto&apos;g&apos;ri daraja: <code>{level}</code>
        </p>
        <Link href="/me" className="mt-4 inline-block text-accent hover:underline">
          Orqaga
        </Link>
      </div>
    );
  }

  if (!isLoggedIn()) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center font-sans">
        <p className="text-soft">
          Sertifikatni ko&apos;rish uchun{" "}
          <Link href={`/login?next=/certificate/${level}`} className="text-accent">
            kiring
          </Link>
        </p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const gradient = `linear-gradient(135deg, ${info.from} 0%, ${info.to} 100%)`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 font-sans">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-sm text-soft transition hover:text-ink"
        >
          <ArrowLeft size={15} /> Orqaga
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Printer size={15} /> PDF sifatida saqlash
        </button>
      </div>

      {/* Certificate card */}
      <div
        id="certificate"
        className="relative overflow-hidden rounded-3xl bg-white shadow-[0_20px_80px_rgba(0,0,0,.15)] print:rounded-none print:shadow-none"
      >
        {/* Gradient header banner */}
        <div
          className="relative flex flex-col items-center justify-center px-12 py-12 text-white"
          style={{ background: gradient }}
        >
          {/* Decorative circles */}
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute bottom-4 left-12 h-14 w-14 rounded-full bg-white/10" />

          {/* WS badge */}
          <div className="relative z-10 mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/40">
            <span className="font-display text-2xl font-bold tracking-tight text-white">
              WS
            </span>
          </div>

          <p className="relative z-10 mb-1 text-xs font-bold uppercase tracking-[0.3em] text-white/70">
            Wisar · wisar.uz
          </p>

          <h1 className="relative z-10 font-book text-3xl font-bold tracking-tight sm:text-4xl">
            Muvaffaqiyat sertifikati
          </h1>
        </div>

        {/* Body */}
        <div className="px-12 py-10 text-center">
          <p className="mb-6 text-soft">Bu sertifikat quyidagiga beriladi:</p>

          {/* Name */}
          <div className="mb-6 font-book text-4xl font-bold text-ink">
            {user?.name || user?.email || "O‘quvchi"}
          </div>

          <p className="mb-4 text-soft">
            <span className="font-semibold text-ink">Ingliz tili</span> kursining
          </p>

          {/* Level badge */}
          <div
            className="mx-auto mb-4 inline-block rounded-full px-8 py-2.5 text-xl font-bold text-white shadow-lg"
            style={{ background: gradient }}
          >
            {info.label}
          </div>

          <p className="mb-8 text-soft">darajasini muvaffaqiyatli tugatganligi uchun</p>

          {/* Meta */}
          <div className="mb-10 text-sm text-muted">
            <p className="font-medium text-soft">{info.desc}</p>
            <p className="mt-1">{today}</p>
          </div>

          {/* Divider */}
          <div className="mx-auto flex max-w-xs items-center gap-3">
            <div
              className="h-px flex-1 opacity-30"
              style={{ background: info.from }}
            />
            <Award size={18} style={{ color: info.from }} className="opacity-60" />
            <div
              className="h-px flex-1 opacity-30"
              style={{ background: info.to }}
            />
          </div>

          <p className="mt-4 text-xs text-muted">
            Wisar O&apos;quv platformasi tomonidan taqdim etildi
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #certificate {
            display: block !important;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            border-radius: 0;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
