"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import { get2faStatus, setup2fa, enable2fa, disable2fa } from "@/lib/auth";
import { toast } from "@/lib/ui";

/** 2FA (TOTP) sozlash (40-vazifa) — /me sahifasida. */
export function TwoFactorSetup() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    get2faStatus().then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false));
  }, []);

  if (enabled === null) return null;

  async function startSetup() {
    setBusy(true);
    try {
      const s = await setup2fa();
      setQr(s.qr);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setBusy(true);
    try {
      await enable2fa(code.trim());
      setEnabled(true);
      setQr(null);
      setCode("");
      toast("2FA yoqildi", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      await disable2fa(code.trim());
      setEnabled(false);
      setCode("");
      toast("2FA o'chirildi", "info");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-page p-5">
      <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
        {enabled ? <ShieldCheck size={17} className="text-success" /> : <ShieldOff size={17} className="text-soft" />}
        Ikki bosqichli himoya (2FA)
      </div>

      {enabled ? (
        <div>
          <p className="mb-3 text-sm text-soft">2FA yoqilgan. O'chirish uchun ilovadagi kodni kiriting.</p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              inputMode="numeric"
              className="w-28 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              onClick={turnOff}
              disabled={busy || code.length < 6}
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-soft hover:text-danger disabled:opacity-50"
            >
              O'chirish
            </button>
          </div>
        </div>
      ) : qr ? (
        <div>
          <p className="mb-2 text-sm text-soft">
            Google Authenticator / Authy bilan QR kodni skanerlang, so'ng kodni kiriting:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="2FA QR" width={160} height={160} className="mb-3 rounded-lg border border-line" />
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              inputMode="numeric"
              className="w-28 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              onClick={confirmEnable}
              disabled={busy || code.length < 6}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : "Yoqish"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-soft">
            Hisobingizni qo'shimcha himoyalang — kirishda authenticator kodi so'raladi.
          </p>
          <button
            onClick={startSetup}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            2FA yoqish
          </button>
        </div>
      )}
    </div>
  );
}
