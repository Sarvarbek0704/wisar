"use client";

import { useEffect, useState } from "react";
import { CircleCheck, CircleX, Info, X } from "lucide-react";
import {
  subscribeToast,
  subscribeDialog,
  type ToastMsg,
  type DialogReq,
} from "@/lib/ui";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [dialog, setDialog] = useState<DialogReq | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    const offToast = subscribeToast((t) => {
      setToasts((p) => [...p, t]);
      setTimeout(() => {
        setToasts((p) => p.filter((x) => x.id !== t.id));
      }, 3200);
    });
    const offDialog = subscribeDialog((d) => {
      setDialog(d);
      setInput(d.defaultValue || "");
    });
    return () => {
      offToast();
      offDialog();
    };
  }, []);

  function answer(v: boolean | string | null) {
    dialog?.resolve(v);
    setDialog(null);
  }

  return (
    <>
      {/* Toastlar */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 font-sans">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-in flex items-center gap-2 rounded-xl border border-line bg-page px-4 py-2.5 text-sm shadow-card"
          >
            {t.type === "success" && (
              <CircleCheck size={16} className="flex-none text-green-500" />
            )}
            {t.type === "error" && (
              <CircleX size={16} className="flex-none text-red-500" />
            )}
            {t.type === "info" && (
              <Info size={16} className="flex-none text-accent" />
            )}
            <span className="text-ink">{t.text}</span>
          </div>
        ))}
      </div>

      {/* Dialog (confirm / prompt) */}
      {dialog && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 font-sans backdrop-blur-sm"
          onClick={() => answer(dialog.kind === "confirm" ? false : null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-page p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-ink">{dialog.text}</p>
            {dialog.kind === "prompt" && (
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && answer(input)}
                className="mt-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none focus:border-accent"
              />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => answer(dialog.kind === "confirm" ? false : null)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-soft transition hover:text-ink"
              >
                Bekor
              </button>
              <button
                onClick={() => answer(dialog.kind === "confirm" ? true : input)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {dialog.kind === "confirm" ? "Ha" : "Saqlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
