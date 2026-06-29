"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, Flame, CalendarDays, User } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type PublicProfile = {
  id: string;
  name: string | null;
  completedCount: number;
  streakCurrent: number;
  joinedAt: string;
};

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/users/${id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-sans">
        <p className="text-soft">Yuklanmoqda...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 text-center font-sans">
        <User size={48} className="mx-auto mb-4 text-black/20" />
        <h1 className="text-xl font-bold text-ink">Foydalanuvchi topilmadi</h1>
        <p className="mt-2 text-sm text-soft">Bu profil mavjud emas.</p>
      </div>
    );
  }

  const joinedAt = new Date(profile.joinedAt).toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-sm px-4 py-12 font-sans">
      {/* Avatar + ism */}
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
          <span className="text-3xl font-bold text-accent">
            {profile.name ? profile.name[0].toUpperCase() : "?"}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-ink">
          {profile.name || "Anonim foydalanuvchi"}
        </h1>
        <p className="text-sm text-soft">
          <CalendarDays size={13} className="mr-1 inline" />
          {joinedAt} dan beri
        </p>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-line bg-page p-5 text-center">
          <BookOpen size={22} className="mx-auto mb-2 text-accent" />
          <div className="text-3xl font-extrabold text-ink">{profile.completedCount}</div>
          <div className="mt-1 text-xs text-soft">bob o'qilgan</div>
        </div>
        <div className="rounded-2xl border border-line bg-page p-5 text-center">
          <Flame size={22} className="mx-auto mb-2 text-orange-500" />
          <div className="text-3xl font-extrabold text-ink">{profile.streakCurrent}</div>
          <div className="mt-1 text-xs text-soft">kunlik streak</div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-soft hover:text-accent">
          ← Platformaga qaytish
        </Link>
      </div>
    </div>
  );
}
