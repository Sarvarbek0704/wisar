"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, Send, Smartphone } from "lucide-react";
import {
  checkPhoneLink,
  clearPendingPhone,
  readPendingPhone,
  type PhoneVerification,
} from "@/lib/auth";

/** Raqamni o'qish uchun chiroyli ko'rinishga keltiramiz. */
function pretty(phone: string): string {
  if (!/^998\d{9}$/.test(phone)) return phone;
  return `+${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8, 10)} ${phone.slice(10)}`;
}

/** Tasdiqlanishini kutish oralig'i. */
const POLL_MS = 3000;

function VerifyPhoneInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/kurslar";

  const [pending, setPending] = useState<PhoneVerification | null>(null);
  const [status, setStatus] = useState<"kutilmoqda" | "tasdiqlandi" | "muddati_tugadi">(
    "kutilmoqda",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const p = readPendingPhone();
    if (!p) {
      router.replace("/login");
      return;
    }
    setPending(p);
  }, [router]);

  const poll = useCallback(
    async (token: string) => {
      const r = await checkPhoneLink(token).catch(() => ({ verified: false }));
      if (r.verified) {
        setStatus("tasdiqlandi");
        clearPendingPhone();
        return;
      }
      if ("expired" in r && r.expired) {
        setStatus("muddati_tugadi");
        return;
      }
      timer.current = setTimeout(() => poll(token), POLL_MS);
    },
    [],
  );

  useEffect(() => {
    if (!pending?.linkToken) return;
    poll(pending.linkToken);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pending, poll]);

  if (!pending) {
    return (
      <div className="grid min-h-[60vh] place-items-center font-sans">
        <Loader2 className="animate-spin text-soft" />
      </div>
    );
  }

  if (status === "tasdiqlandi") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 text-center font-sans">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-green-500/10 text-green-600">
          <CheckCircle2 size={28} />
        </span>
        <h1 className="text-2xl font-bold text-ink">Raqam tasdiqlandi</h1>
        <p className="mt-2 text-sm text-soft">
          {pretty(pending.phone)} — endi shu raqam va parolingiz bilan kirishingiz mumkin.
        </p>
        <button
          onClick={() => router.push(`/login?next=${encodeURIComponent(next)}`)}
          className="mt-6 w-full rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:opacity-90"
        >
          Kirish
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 font-sans">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-accent text-white">
          <Smartphone size={24} />
        </span>
        <h1 className="text-2xl font-bold text-ink">Raqamni tasdiqlang</h1>
        <p className="mt-1 text-sm text-soft">{pretty(pending.phone)}</p>
      </div>

      <div className="rounded-2xl border border-line bg-page p-6 shadow-card">
        {status === "muddati_tugadi" ? (
          <>
            <p className="text-sm text-ink">
              Tasdiqlash havolasining muddati tugadi.
            </p>
            <Link
              href="/login"
              className="mt-4 block w-full rounded-lg bg-accent py-2.5 text-center font-semibold text-white transition hover:opacity-90"
            >
              Qaytadan urinish
            </Link>
          </>
        ) : (
          <>
            <ol className="mb-5 space-y-2.5 text-sm text-ink">
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                  1
                </span>
                Pastdagi tugmani bosing — Telegram ochiladi
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                  2
                </span>
                Botda <b>Start</b> ni bosing
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                  3
                </span>
                <span>
                  <b>“📱 Raqamni ulashish”</b> tugmasini bosing — tamom
                </span>
              </li>
            </ol>

            {pending.telegramUrl ? (
              <a
                href={pending.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] py-3 font-semibold text-white transition hover:opacity-90"
              >
                <Send size={18} />
                Telegram orqali tasdiqlash
              </a>
            ) : (
              <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700">
                Telegram bot hozircha sozlanmagan. Iltimos, email bilan ro'yxatdan o'ting
                yoki keyinroq urinib ko'ring.
              </p>
            )}

            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-soft">
              <Loader2 size={13} className="animate-spin" />
              Tasdiqlanishini kutmoqdamiz — bu sahifani yopmang
            </p>
            <p className="mt-2 text-center text-xs text-soft">
              Havola {pending.expiresInMinutes} daqiqa amal qiladi
            </p>
          </>
        )}
      </div>

      <Link href="/register" className="mt-4 text-center text-sm text-soft hover:text-accent">
        Boshqa raqam bilan ro'yxatdan o'tish
      </Link>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense
      fallback={<p className="p-10 text-center font-sans text-soft">Yuklanmoqda...</p>}
    >
      <VerifyPhoneInner />
    </Suspense>
  );
}
