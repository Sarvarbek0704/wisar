"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, LogIn, ChevronRight } from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import { getMyGroups, createGroup, joinGroup, type GroupSummary } from "@/lib/groups-api";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/lib/ui";

export default function GroupsPage() {
  const [mounted, setMounted] = useState(false);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setGroups(await getMyGroups());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    setMounted(true);
    if (isLoggedIn()) load();
    else setLoading(false);
  }, []);

  if (!mounted) return null;
  if (!isLoggedIn()) {
    return (
      <div className="mx-auto max-w-page px-4 py-16 text-center font-sans">
        <p className="text-soft">
          Guruhlarni ko'rish uchun{" "}
          <Link href="/login?next=/groups" className="text-accent">kiring</Link>.
        </p>
      </div>
    );
  }

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createGroup(name.trim());
      setName("");
      toast("Guruh yaratildi", "success");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function join() {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await joinGroup(code.trim());
      setCode("");
      toast("Guruhga qo'shildingiz", "success");
      await load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-page px-4 py-10 font-sans sm:px-6">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold text-ink">
        <Users size={22} className="text-accent" />
        O'quv guruhlari
      </h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-page p-4">
          <div className="mb-2 text-sm font-semibold text-ink">Yangi guruh</div>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Guruh nomi"
              className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              onClick={create}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Plus size={15} /> Yaratish
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-page p-4">
          <div className="mb-2 text-sm font-semibold text-ink">Kod bilan qo'shilish</div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="KOD"
              className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm uppercase text-ink outline-none focus:border-accent"
            />
            <button
              onClick={join}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-soft hover:text-accent disabled:opacity-50"
            >
              <LogIn size={15} /> Qo'shilish
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="text-soft">Yuklanmoqda...</p>}

      {!loading && groups.length === 0 && (
        <EmptyState
          icon={Users}
          title="Hali guruhingiz yo'q"
          description="Guruh yarating va kodni do'stlaringizga ulashing — birga progress kuzating."
        />
      )}

      <ul className="space-y-2">
        {groups.map((g) => (
          <li key={g.id}>
            <Link
              href={`/groups/${g.id}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-page px-4 py-3 transition hover:border-accent/40"
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-accent/10 text-accent">
                <Users size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{g.name}</span>
                <span className="block text-xs text-soft">
                  {g._count.members} a'zo · kod: <span className="font-mono">{g.code}</span>
                </span>
              </span>
              <ChevronRight size={16} className="flex-none text-soft" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
