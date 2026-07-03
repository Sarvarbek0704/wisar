"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, ShieldOff, Trash2, Search, Users as UsersIcon } from "lucide-react";
import {
  adminListUsers,
  adminSetUserRole,
  adminDeleteUser,
  type AdminUser,
} from "@/lib/admin-api";
import { getUser as getCurrentUser } from "@/lib/auth";
import { toast, confirmDialog } from "@/lib/ui";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const me = typeof window !== "undefined" ? getCurrentUser() : null;

  const load = useCallback(async (search = "", skip = 0) => {
    setLoading(true);
    try {
      const res = await adminListUsers(search, 50, skip);
      setUsers((prev) => (skip === 0 ? res.items : [...prev, ...res.items]));
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function toggleRole(u: AdminUser) {
    const next = u.role === "admin" ? "user" : "admin";
    if (!(await confirmDialog(`"${u.email}" rolini "${next}" qilamizmi?`))) return;
    await adminSetUserRole(u.id, next);
    toast("Rol yangilandi");
    load(q);
  }

  async function remove(u: AdminUser) {
    if (!(await confirmDialog(`"${u.email}" foydalanuvchisi va uning BARCHA ma'lumotlari o'chsinmi?`))) return;
    try {
      await adminDeleteUser(u.id);
      setUsers((p) => p.filter((x) => x.id !== u.id));
      toast("Foydalanuvchi o'chirildi");
    } catch (e) {
      toast("Xato: " + (e as Error).message);
    }
  }

  function fmt(d: string) {
    return new Date(d).toLocaleDateString("uz", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Foydalanuvchilar</h1>
          <p className="text-sm text-soft">{total} ta foydalanuvchi</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-page px-3 py-2 sm:w-auto">
          <Search size={15} className="flex-none text-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder="Email yoki ism..."
            className="w-full bg-transparent text-sm text-ink outline-none sm:w-44"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-soft">Yuklanmoqda...</p>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-line bg-page p-12 text-center">
          <UsersIcon size={36} className="mx-auto mb-3 text-soft/40" />
          <p className="text-soft">Foydalanuvchi topilmadi.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-bg text-left text-xs uppercase text-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Foydalanuvchi</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Faollik</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Sana</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-page">
              {users.map((u) => {
                const isSelf = me?.id === u.id;
                return (
                  <tr key={u.id} className="group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-accent text-xs font-bold text-white">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">
                            {u.name || u.email.split("@")[0]}
                            {isSelf && <span className="ml-1.5 text-xs text-accent">(siz)</span>}
                          </div>
                          <div className="truncate text-xs text-soft">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-soft md:table-cell">
                      {u._count.progress} bob · {u._count.comments} izoh · {u._count.bookmarks} saqlangan
                    </td>
                    <td className="hidden px-4 py-3 text-soft sm:table-cell">{fmt(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs font-semibold " +
                          (u.role === "admin" ? "bg-accent/15 text-accent" : "bg-bg text-soft")
                        }
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleRole(u)}
                          title={u.role === "admin" ? "Admin huquqini olish" : "Admin qilish"}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-soft hover:text-accent"
                        >
                          {u.role === "admin" ? <ShieldOff size={14} /> : <Shield size={14} />}
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => remove(u)}
                            title="O'chirish"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-soft hover:text-rose-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && users.length < total && (
        <button
          onClick={() => load(q, users.length)}
          className="mt-4 w-full rounded-lg border border-line py-2.5 text-sm font-medium text-soft hover:text-accent"
        >
          Ko'proq yuklash ({users.length}/{total})
        </button>
      )}
    </div>
  );
}
