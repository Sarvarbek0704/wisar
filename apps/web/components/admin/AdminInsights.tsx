"use client";

import { useEffect, useState } from "react";
import { Activity, GitMerge, History } from "lucide-react";
import {
  adminAnalytics,
  adminAuditLog,
  type AdminAnalytics,
  type AdminAuditEntry,
} from "@/lib/admin-api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.floor(h / 24)} kun oldin`;
}

/** Kengaytirilgan admin analitikasi (31) + audit jurnal (40). */
export function AdminInsights() {
  const [a, setA] = useState<AdminAnalytics | null>(null);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);

  useEffect(() => {
    adminAnalytics().then(setA).catch(() => {});
    adminAuditLog().then(setAudit).catch(() => {});
  }, []);

  if (!a) return null;

  const funnelMax = Math.max(a.funnel.registered, 1);
  const funnel = [
    { label: "Ro'yxatdan o'tgan", value: a.funnel.registered },
    { label: "Email tasdiqlangan", value: a.funnel.verified },
    { label: "Birinchi dars", value: a.funnel.withProgress },
  ];

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      {/* DAU/MAU + retention */}
      <div className="rounded-2xl border border-line bg-page p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
          <Activity size={17} className="text-accent" /> Faollik
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-bg p-3">
            <div className="text-2xl font-bold text-ink">{a.dau}</div>
            <div className="text-xs text-soft">DAU (bugun)</div>
          </div>
          <div className="rounded-xl bg-bg p-3">
            <div className="text-2xl font-bold text-ink">{a.mau}</div>
            <div className="text-xs text-soft">MAU (30 kun)</div>
          </div>
          <div className="rounded-xl bg-bg p-3">
            <div className="text-2xl font-bold text-ink">{a.retention.d1}%</div>
            <div className="text-xs text-soft">D1 retention</div>
          </div>
          <div className="rounded-xl bg-bg p-3">
            <div className="text-2xl font-bold text-ink">{a.retention.d7}%</div>
            <div className="text-xs text-soft">D7 retention</div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-soft">
          Retention so'nggi 30 kunlik {a.retention.cohort} ta yangi foydalanuvchi bo'yicha.
        </p>
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-line bg-page p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
          <GitMerge size={17} className="text-accent" /> Funnel
        </h2>
        <div className="space-y-2.5">
          {funnel.map((f) => (
            <div key={f.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-soft">{f.label}</span>
                <span className="font-semibold text-ink">{f.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(f.value / funnelMax) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top / least articles */}
      <div className="rounded-2xl border border-line bg-page p-5">
        <h2 className="mb-3 font-bold text-ink">Eng ko'p o'qilgan</h2>
        <ul className="space-y-1.5 text-sm">
          {a.topArticles.map((x, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate text-ink">{x.title}</span>
              <span className="flex-none text-soft">{x.reads}</span>
            </li>
          ))}
          {a.topArticles.length === 0 && <li className="text-soft">Ma'lumot yo'q.</li>}
        </ul>
      </div>

      <div className="rounded-2xl border border-line bg-page p-5">
        <h2 className="mb-3 font-bold text-ink">Eng kam o'qilgan</h2>
        <ul className="space-y-1.5 text-sm">
          {a.leastArticles.map((x, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate text-ink">{x.title}</span>
              <span className="flex-none text-soft">{x.reads}</span>
            </li>
          ))}
          {a.leastArticles.length === 0 && <li className="text-soft">Ma'lumot yo'q.</li>}
        </ul>
      </div>

      {/* Audit log */}
      <div className="rounded-2xl border border-line bg-page p-5 lg:col-span-2">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
          <History size={17} className="text-accent" /> Audit jurnal
        </h2>
        <div className="space-y-1.5">
          {audit.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <span className="rounded bg-bg px-2 py-0.5 font-mono text-xs text-ink">{e.action}</span>
              <span className="text-soft">{e.actor}</span>
              {e.target && <span className="truncate text-xs text-soft">→ {e.target}</span>}
              <span className="ml-auto flex-none text-xs text-soft">{timeAgo(e.createdAt)}</span>
            </div>
          ))}
          {audit.length === 0 && <p className="text-sm text-soft">Hali yozuv yo'q.</p>}
        </div>
      </div>
    </div>
  );
}
