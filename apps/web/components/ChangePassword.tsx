"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { isLoggedIn, changePassword } from "@/lib/auth";
import { toast } from "@/lib/ui";

/** Parolni yangilash kartasi — /me sahifasida (Xavfsizlik bo'limi). */
export function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isLoggedIn()) return null;

  const valid = current.length > 0 && next.length >= 6 && next === confirm;

  async function submit() {
    if (next !== confirm) {
      toast("Yangi parollar mos emas", "error");
      return;
    }
    setBusy(true);
    try {
      const r = await changePassword(current, next);
      toast(r.message || "Parol yangilandi", "success");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent";

  return (
    <div className="rounded-2xl border border-line bg-page p-5">
      <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
        <KeyRound size={17} className="text-soft" />
        Parolni o&apos;zgartirish
      </div>
      <p className="mb-3 text-sm text-soft">
        Yangilangandan so&apos;ng boshqa qurilmalardagi sessiyalar yopiladi.
      </p>
      <div className="flex max-w-sm flex-col gap-2">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Joriy parol"
          autoComplete="current-password"
          className={inputCls}
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Yangi parol (kamida 6 belgi)"
          autoComplete="new-password"
          className={inputCls}
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Yangi parolni tasdiqlang"
          autoComplete="new-password"
          className={inputCls}
        />
        {confirm.length > 0 && next !== confirm && (
          <p className="text-xs text-danger">Parollar mos emas</p>
        )}
        <button
          onClick={submit}
          disabled={busy || !valid}
          className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
          Yangilash
        </button>
      </div>
    </div>
  );
}
