"use client";

import { useState } from "react";
import { Plus, Trash2, X, Check } from "lucide-react";
import {
  CATEGORIES,
  cat,
  toMin,
  nowMinutes,
  uid,
  type Block,
  type Category,
} from "@/lib/planner";
import { CategoryIcon } from "./CategoryIcon";

const DAY_START = 6; // 06:00
const DAY_END = 24; // 24:00
const HOUR_H = 54; // px

type FormState = { id: string; start: string; end: string; title: string; category: Category };

function blankForm(): FormState {
  const h = Math.min(Math.max(new Date().getHours(), DAY_START), DAY_END - 1);
  const hh = h.toString().padStart(2, "0");
  const eh = (h + 1).toString().padStart(2, "0");
  return { id: "", start: `${hh}:00`, end: `${eh}:00`, title: "", category: "study" };
}

export function DayView({
  blocks,
  onChange,
  showNow,
}: {
  blocks: Block[];
  onChange: (b: Block[]) => void;
  showNow: boolean;
}) {
  const [form, setForm] = useState<FormState | null>(null);

  const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);
  const sorted = [...blocks].sort((a, b) => toMin(a.start) - toMin(b.start));
  const nowTop = ((nowMinutes() - DAY_START * 60) / 60) * HOUR_H;
  const nowVisible = showNow && nowMinutes() >= DAY_START * 60 && nowMinutes() <= DAY_END * 60;

  function openNew() {
    setForm(blankForm());
  }
  function openEdit(b: Block) {
    setForm({ id: b.id, start: b.start, end: b.end, title: b.title, category: b.category });
  }
  function save() {
    if (!form) return;
    if (!form.title.trim()) return;
    if (toMin(form.end) <= toMin(form.start)) return;
    const block: Block = {
      id: form.id || uid(),
      start: form.start,
      end: form.end,
      title: form.title.trim(),
      category: form.category,
    };
    onChange(form.id ? blocks.map((b) => (b.id === form.id ? block : b)) : [...blocks, block]);
    setForm(null);
  }
  function remove(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
    setForm(null);
  }

  return (
    <div className="rounded-2xl border border-line bg-page p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-sans text-lg font-bold text-ink">Kun jadvali</h2>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          <Plus size={15} /> Blok
        </button>
      </div>

      {/* Timeline */}
      <div className="relative" style={{ height: (DAY_END - DAY_START) * HOUR_H }}>
        {/* hour rows */}
        {hours.map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex"
            style={{ top: i * HOUR_H, height: HOUR_H }}
          >
            <span className="w-12 -translate-y-2 pr-2 text-right text-xs tabular-nums text-soft">
              {h.toString().padStart(2, "0")}:00
            </span>
            <div className="flex-1 border-t border-dashed border-line" />
          </div>
        ))}

        {/* now line */}
        {nowVisible && (
          <div className="absolute left-12 right-0 z-20 flex items-center" style={{ top: nowTop }}>
            <span className="h-2 w-2 -translate-x-1 rounded-full bg-rose-500" />
            <span className="h-px flex-1 bg-rose-500" />
          </div>
        )}

        {/* blocks */}
        <div className="absolute left-12 right-0 top-0 bottom-0">
          {sorted.map((b) => {
            const top = ((toMin(b.start) - DAY_START * 60) / 60) * HOUR_H;
            const height = Math.max(((toMin(b.end) - toMin(b.start)) / 60) * HOUR_H, 22);
            const c = cat(b.category);
            return (
              <button
                key={b.id}
                onClick={() => openEdit(b)}
                className="group absolute left-0 right-1 z-10 flex flex-col overflow-hidden rounded-lg border border-line bg-page px-2.5 py-1 text-left shadow-sm transition hover:shadow-md"
                style={{ top, height }}
              >
                <span className={`absolute left-0 top-0 h-full w-1 ${c.dot}`} />
                <span className="truncate pl-1.5 text-sm font-medium text-ink">{b.title}</span>
                {height > 34 && (
                  <span className="pl-1.5 text-xs tabular-nums text-soft">
                    {b.start}–{b.end} · <CategoryIcon name={c.icon} size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {blocks.length === 0 && !form && (
        <p className="mt-2 text-center text-sm text-soft">
          Hali blok yo'q. <button onClick={openNew} className="text-accent hover:underline">Birinchisini qo'shing</button>.
        </p>
      )}

      {/* Form */}
      {form && (
        <div className="mt-4 animate-fade-in rounded-xl border border-accent/20 bg-accent/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{form.id ? "Blokni tahrirlash" : "Yangi blok"}</span>
            <button onClick={() => setForm(null)} className="text-soft hover:text-ink">
              <X size={16} />
            </button>
          </div>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Nima qilasiz? (masalan: Ingliz tili — C1 dars)"
            className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
          <div className="mb-3 flex items-center gap-2">
            <input
              type="time"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
            />
            <span className="text-soft">–</span>
            <input
              type="time"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              className="rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setForm({ ...form, category: c.key })}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  form.category === c.key ? c.chip + " ring-2 ring-offset-1 ring-accent/30" : "bg-bg text-soft"
                }`}
              >
                <CategoryIcon name={c.icon} size={13} /> {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Check size={15} /> Saqlash
            </button>
            {form.id && (
              <button
                onClick={() => remove(form.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 hover:bg-rose-500/20"
              >
                <Trash2 size={15} /> O'chirish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
