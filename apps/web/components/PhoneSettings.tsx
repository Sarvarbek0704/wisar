"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Phone, Send } from "lucide-react";
import { checkPhoneLink, setPhone as setPhoneApi, type PhoneVerification } from "@/lib/auth";
import { toast } from "@/lib/ui";

/** Raqamni o'qish uchun chiroyli ko'rinishga keltiramiz. */
function pretty(phone: string): string {
  if (!/^998\d{9}$/.test(phone)) return phone;
  return `+${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8, 10)} ${phone.slice(10)}`;
}

const POLL_MS = 3000;

/**
 * Profilda telefon raqamini qo'shish/o'zgartirish va Telegram orqali tasdiqlash.
 *
 * Tasdiqlangan raqam kirish uchun ishlatiladi (email o'rniga ham) — shuning
 * uchun tasdiqlanmagan raqamga tayanmaymiz.
 */
export function PhoneSettings({
  initialPhone,
  initialVerified,
}: {
  initialPhone: string | null;
  initialVerified: boolean;
}) {
  const [phone, setPhone] = useState(initialPhone ? pretty(initialPhone) : "");
  const [verified, setVerified] = useState(initialVerified);
  const [pending, setPending] = useState<PhoneVerification | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tasdiqlanishini kutamiz — foydalanuvchi Telegram'da tugmani bosgach o'zi yangilanadi
  useEffect(() => {
    if (!pending?.linkToken) return;
    let stopped = false;
    const tick = async () => {
      const r = await checkPhoneLink(pending.linkToken).catch(() => ({ verified: false }));
      if (stopped) return;
      if (r.verified) {
        setVerified(true);
        setPending(null);
        toast("Telefon raqami tasdiqlandi.", "success");
        return;
      }
      timer.current = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      stopped = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pending]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await setPhoneApi(phone.trim());
      setPending(r);
      setVerified(false);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-page p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-ink">
        <Phone size={17} className="text-soft" />
        Telefon raqami
      </h2>
      <p className="mb-4 text-sm text-soft">
        Tasdiqlangan raqam bilan saytga kirishingiz mumkin — email o'rniga ham ishlaydi.
      </p>

      {verified && !pending && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 size={16} />
          {pretty(initialPhone ?? "")} — tasdiqlangan
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998 90 123 45 67"
          autoComplete="tel"
          className="flex-1 rounded-lg border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={saving || !phone.trim()}
          className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "..." : verified ? "O'zgartirish" : "Saqlash"}
        </button>
      </form>

      {pending && (
        <div className="mt-4 rounded-lg border border-line bg-bg p-4">
          <p className="mb-3 text-sm text-ink">
            {pretty(pending.phone)} raqamini tasdiqlash uchun Telegram'da{" "}
            <b>“📱 Raqamni ulashish”</b> tugmasini bosing.
          </p>
          {pending.telegramUrl ? (
            <a
              href={pending.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] py-2.5 font-semibold text-white transition hover:opacity-90"
            >
              <Send size={17} />
              Telegram orqali tasdiqlash
            </a>
          ) : (
            <p className="text-sm text-amber-700">Telegram bot hozircha sozlanmagan.</p>
          )}
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-soft">
            <Loader2 size={13} className="animate-spin" />
            Tasdiqlanishini kutmoqdamiz
          </p>
        </div>
      )}
    </section>
  );
}
