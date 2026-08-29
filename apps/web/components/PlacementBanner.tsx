"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, X } from "lucide-react";

/**
 * "Qayerdan boshlash" bannerı.
 *
 * 700+ maqola oldida yangi foydalanuvchi yo'qoladi. Placement testi
 * (`/onboarding`) mavjud edi, lekin unga hech qayerdan havola yo'q edi —
 * natijada hech kim darajasini aniqlamagan. Bu banner o'sha bo'shliqni yopadi.
 */
export function PlacementBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem("wisar-onboarded") === "true";
    const dismissed = localStorage.getItem("wisar-placement-dismissed") === "true";
    setShow(!onboarded && !dismissed);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem("wisar-placement-dismissed", "true");
    setShow(false);
  }

  return (
    <div className="mb-6 flex items-start gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-white">
        <Compass size={22} />
      </span>

      <div className="flex-1">
        <h2 className="font-sans font-bold text-ink">Qayerdan boshlashni bilmayapsizmi?</h2>
        <p className="mt-1 text-sm text-soft">
          1 daqiqalik test darajangizni aniqlaydi va aynan sizga mos darsni ochadi —
          boshidan o'qib chiqish shart emas.
        </p>
        <Link
          href="/onboarding"
          className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Darajamni aniqlash
        </Link>
      </div>

      <button
        onClick={dismiss}
        className="shrink-0 text-soft transition hover:text-ink"
        aria-label="Yopish"
      >
        <X size={18} />
      </button>
    </div>
  );
}
