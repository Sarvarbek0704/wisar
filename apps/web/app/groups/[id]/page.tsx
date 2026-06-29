"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Flame, CircleCheck, Crown, Copy, LogOut } from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import { getGroup, leaveGroup, type GroupDetail } from "@/lib/groups-api";
import { toast, confirmDialog } from "@/lib/ui";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      return;
    }
    getGroup(id)
      .then(setData)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  async function leave() {
    if (!(await confirmDialog("Guruhdan chiqmoqchimisiz?"))) return;
    try {
      await leaveGroup(id);
      toast("Guruhdan chiqdingiz", "info");
      router.push("/groups");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (loading) return <p className="mx-auto max-w-page px-4 py-16 text-center text-soft">Yuklanmoqda...</p>;
  if (err || !data)
    return (
      <div className="mx-auto max-w-page px-4 py-16 text-center font-sans">
        <p className="text-danger">{err || "Topilmadi"}</p>
        <Link href="/groups" className="mt-3 inline-block text-accent">← Guruhlar</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-page px-4 py-10 font-sans sm:px-6">
      <Link href="/groups" className="mb-4 inline-flex items-center gap-1.5 text-sm text-soft hover:text-accent">
        <ArrowLeft size={15} /> Guruhlar
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Users size={22} className="text-accent" />
            {data.name}
          </h1>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(data.code);
              toast("Kod nusxalandi", "success");
            }}
            className="mt-1 inline-flex items-center gap-1 text-sm text-soft hover:text-accent"
          >
            <Copy size={13} /> Kod: <span className="font-mono font-semibold">{data.code}</span>
          </button>
        </div>
        <button
          onClick={leave}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-soft hover:border-danger/40 hover:text-danger"
        >
          <LogOut size={13} /> {data.isOwner ? "Guruhni o'chirish" : "Chiqish"}
        </button>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-soft">
        A'zolar ({data.members.length}) — haftalik faollik bo'yicha
      </h2>
      <ul className="space-y-2">
        {data.members.map((m, i) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-page px-4 py-3"
          >
            <span className="w-5 flex-none text-center text-sm font-bold text-soft">{i + 1}</span>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-accent/10 text-sm font-bold text-accent">
              {m.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 truncate font-semibold text-ink">
                {m.name}
                {m.isOwner && <Crown size={13} className="text-amber-500" />}
              </span>
              <span className="flex items-center gap-3 text-xs text-soft">
                <span className="inline-flex items-center gap-1">
                  <CircleCheck size={12} /> {m.completedCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Flame size={12} className="text-orange-500" /> {m.streakCurrent}
                </span>
              </span>
            </span>
            <span className="flex-none text-right">
              <span className="text-sm font-bold text-ink">{m.weeklyMinutes}</span>
              <span className="block text-[10px] text-soft">daq/hafta</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
