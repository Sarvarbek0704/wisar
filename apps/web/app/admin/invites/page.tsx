"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, Ticket, Check, Clock } from "lucide-react";
import {
  adminListInvites, adminCreateInvite, adminDeleteInvite, type AdminInvite,
} from "@/lib/admin-api";
import { toast, confirmDialog } from "@/lib/ui";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminInvitesPage() {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setInvites(await adminListInvites());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const inv = await adminCreateInvite();
    setInvites((p) => [inv, ...p]);
    const url = `${window.location.origin}/join/${inv.code}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast("Taklif yaratildi va nusxalandi");
  }
  async function copy(code: string) {
    const url = `${window.location.origin}/join/${code}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }
  async function remove(inv: AdminInvite) {
    if (!(await confirmDialog("Bu taklifni o'chirasizmi?"))) return;
    await adminDeleteInvite(inv.id);
    setInvites((p) => p.filter((x) => x.id !== inv.id));
    toast("Taklif o'chirildi");
  }

  function status(inv: AdminInvite) {
    if (inv.usedBy) return { label: "Ishlatilgan", cls: "bg-soft/15 text-soft" };
    if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) return { label: "Muddati o'tgan", cls: "bg-rose-500/15 text-rose-600" };
    return { label: "Faol", cls: "bg-emerald-500/15 text-emerald-600" };
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Takliflar</h1>
          <p className="text-sm text-soft">Taklif havolalari (invite) — 7 kun amal qiladi</p>
        </div>
        <button
          onClick={create}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={16} /> Yangi taklif
        </button>
      </div>

      {loading ? (
        <p className="text-soft">Yuklanmoqda...</p>
      ) : invites.length === 0 ? (
        <div className="rounded-2xl border border-line bg-page p-12 text-center">
          <Ticket size={36} className="mx-auto mb-3 text-soft/40" />
          <p className="text-soft">Hali taklif yo'q.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-page">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-soft">
                <th className="px-4 py-3 font-semibold">Kod</th>
                <th className="px-4 py-3 font-semibold">Holat</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Yaratilgan</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Muddat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const st = status(inv);
                return (
                  <tr key={inv.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono text-ink">{inv.code}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-soft sm:table-cell">{fmtDate(inv.createdAt)}</td>
                    <td className="hidden px-4 py-3 text-soft sm:table-cell">
                      <span className="inline-flex items-center gap-1"><Clock size={12} /> {fmtDate(inv.expiresAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => copy(inv.code)}
                          title="Havolani nusxalash"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-soft hover:text-accent"
                        >
                          {copied === inv.code ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        <button
                          onClick={() => remove(inv)}
                          title="O'chirish"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-soft hover:text-rose-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
