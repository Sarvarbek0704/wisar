"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { setEmailOptIn } from "@/lib/me-api";
import { toast } from "@/lib/ui";

/**
 * Haftalik hisobot xatiga obuna.
 *
 * Ilgari bu xat BARCHA foydalanuvchilarga — email tasdiqlamaganlarga ham —
 * yuborilardi va obunani bekor qilish imkoni yo'q edi.
 */
export function EmailPreferences({ initial }: { initial: boolean }) {
  const [optIn, setOptIn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !optIn;
    setSaving(true);
    setOptIn(next); // optimistik
    try {
      await setEmailOptIn(next);
      toast(next ? "Haftalik xat yoqildi." : "Haftalik xat o'chirildi.", "success");
    } catch {
      setOptIn(!next); // qaytaramiz
      toast("Saqlanmadi. Keyinroq urinib ko'ring.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-page p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-ink">
        <Mail size={17} className="text-soft" />
        Email xabarnomalar
      </h2>
      <p className="mb-4 text-sm text-soft">
        Har yakshanba haftalik natijalaringiz haqida qisqa hisobot yuboramiz.
      </p>
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={optIn}
          onChange={toggle}
          disabled={saving}
          className="h-4 w-4 accent-accent"
        />
        <span className="text-sm text-ink">Haftalik hisobotni olishni xohlayman</span>
      </label>
    </section>
  );
}
