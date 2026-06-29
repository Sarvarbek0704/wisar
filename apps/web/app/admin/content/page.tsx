"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, FolderPlus, Settings2, Layers } from "lucide-react";
import {
  adminOverview,
  createTopic,
  deleteTopic,
  createSection,
  type AdminTopic,
} from "@/lib/admin-api";
import { toast, confirmDialog, promptDialog } from "@/lib/ui";
import { CardsSkeleton } from "@/components/Skeleton";

export default function AdminContentPage() {
  const [topics, setTopics] = useState<AdminTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      setTopics(await adminOverview());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function addTopic() {
    const title = await promptDialog("Yangi mavzu nomi:");
    if (!title) return;
    await createTopic({ title });
    toast("Mavzu qo'shildi");
    load();
  }
  async function removeTopic(id: string, title: string) {
    if (!(await confirmDialog(`"${title}" mavzusi va undagi BARCHA kontent o'chsinmi?`)))
      return;
    await deleteTopic(id);
    toast("Mavzu o'chirildi");
    load();
  }
  async function addSection(topicId: string) {
    const title = await promptDialog("Yangi bo'lim nomi:");
    if (!title) return;
    await createSection({ topicId, title });
    toast("Bo'lim qo'shildi");
    load();
  }

  if (loading)
    return (
      <div>
        <div className="mb-6 h-8 w-40 animate-pulse rounded bg-line/60" />
        <CardsSkeleton />
      </div>
    );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Kontent</h1>
          <p className="text-sm text-soft">Mavzular, bo'limlar va maqolalar</p>
        </div>
        <button
          onClick={addTopic}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={16} /> Mavzu
        </button>
      </div>

      {err && <p className="mb-4 text-sm text-red-500">{err}</p>}

      <div className="space-y-4">
        {topics.map((t) => (
          <div key={t.id} className="rounded-2xl border border-line bg-page p-5">
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 flex-none place-items-center rounded-lg text-white"
                style={{ background: t.accent || "var(--accent)" }}
              >
                <Layers size={18} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold text-ink">{t.title}</span>
                  {!t.published && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                      Yashirin
                    </span>
                  )}
                </div>
                <div className="text-xs text-soft">{t.sections.length} bo'lim · /{t.slug}</div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => addSection(t.id)}
                  title="Bo'lim qo'shish"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-soft hover:text-accent"
                >
                  <FolderPlus size={15} />
                </button>
                <Link
                  href={`/admin/topics/${t.slug}`}
                  title="Boshqarish"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-soft hover:text-accent"
                >
                  <Settings2 size={15} />
                </Link>
                <button
                  onClick={() => removeTopic(t.id, t.title)}
                  title="O'chirish"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-soft hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {t.sections.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {t.sections.map((s) => (
                  <li key={s.id} className="rounded-lg border border-line px-2.5 py-1 text-xs text-soft">
                    {s.title} <span className="text-accent">({s._count.articles})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {topics.length === 0 && (
          <p className="text-soft">Hozircha mavzu yo'q. "Mavzu" tugmasi bilan qo'shing.</p>
        )}
      </div>
    </div>
  );
}
