"use client";

import { useEffect, useRef, useState } from "react";
import { Type } from "lucide-react";

const FONTS: { key: string; label: string; size: string }[] = [
  { key: "sm", label: "A", size: "text-xs" },
  { key: "base", label: "A", size: "text-sm" },
  { key: "lg", label: "A", size: "text-base" },
];
const WIDTHS: { key: string; label: string }[] = [
  { key: "normal", label: "Tor" },
  { key: "wide", label: "Keng" },
];

export function ReaderSettings() {
  const [open, setOpen] = useState(false);
  const [font, setFont] = useState("base");
  const [width, setWidth] = useState("normal");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const f = localStorage.getItem("reader-font") || "base";
    const w = localStorage.getItem("reader-width") || "normal";
    setFont(f);
    setWidth(w);
    apply(f, w);
  }, []);

  useEffect(() => {
    function onOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, []);

  function apply(f: string, w: string) {
    const r = document.getElementById("reader");
    if (r) {
      r.setAttribute("data-font", f);
      r.setAttribute("data-width", w);
    }
  }
  function chooseFont(f: string) {
    setFont(f);
    apply(f, width);
    localStorage.setItem("reader-font", f);
  }
  function chooseWidth(w: string) {
    setWidth(w);
    apply(font, w);
    localStorage.setItem("reader-width", w);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="O'qish sozlamalari"
        title="O'qish sozlamalari"
        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-soft transition hover:border-accent/40 hover:text-accent"
      >
        <Type size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-line bg-page p-3 font-sans text-sm shadow-card">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-soft">
            Shrift o'lchami
          </div>
          <div className="mb-3 flex gap-1.5">
            {FONTS.map((f) => (
              <button
                key={f.key}
                onClick={() => chooseFont(f.key)}
                className={
                  "flex-1 rounded-lg border py-1.5 transition " +
                  f.size +
                  (font === f.key
                    ? " border-accent bg-accent/10 text-accent"
                    : " border-line text-soft hover:text-ink")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-soft">
            Kenglik
          </div>
          <div className="flex gap-1.5">
            {WIDTHS.map((w) => (
              <button
                key={w.key}
                onClick={() => chooseWidth(w.key)}
                className={
                  "flex-1 rounded-lg border py-1.5 transition " +
                  (width === w.key
                    ? " border-accent bg-accent/10 text-accent"
                    : " border-line text-soft hover:text-ink")
                }
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
