"use client";

import { useState } from "react";
import { SpellCheck, Loader2, Check } from "lucide-react";
import { grammarCheck, type GrammarResult } from "@/lib/llm-api";
import { isLoggedIn } from "@/lib/auth";

/**
 * Qayta ishlatiladigan grammatika tekshiruv tugmasi (21-vazifa).
 * textarea yoniga qo'yiladi: matnni AI tuzatadi, xatolarni o'zbekcha izohlaydi.
 * onApply berilsa "Qo'llash" tugmasi tuzatilgan matnni qaytaradi.
 */
export function GrammarCheck({
  text,
  onApply,
}: {
  text: string;
  onApply?: (corrected: string) => void;
}) {
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isLoggedIn()) return null;

  async function check() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await grammarCheck(text));
    } catch (e) {
      setError((e as Error).message || "Tekshirib bo'lmadi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={check}
        disabled={loading || !text.trim()}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-soft transition hover:text-accent disabled:opacity-40"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <SpellCheck size={13} />}
        AI grammatika tekshiruvi
      </button>

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}

      {result && (
        <div className="mt-2 rounded-lg border border-line bg-bg p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-soft">Tuzatilgan</div>
          <p className="text-ink">{result.corrected}</p>

          {onApply && result.corrected !== text && (
            <button
              type="button"
              onClick={() => onApply(result.corrected)}
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
            >
              <Check size={12} /> Qo'llash
            </button>
          )}

          {result.errors.length > 0 ? (
            <ul className="mt-3 space-y-1.5 border-t border-line pt-2">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs">
                  <span className="text-danger line-through">{e.original}</span>{" "}
                  <span className="text-success">{e.fix}</span>
                  <span className="block text-soft">{e.why}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-success">Xato topilmadi 👍</p>
          )}
        </div>
      )}
    </div>
  );
}
