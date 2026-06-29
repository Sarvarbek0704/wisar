"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@mana/content";

// O'ngdagi ichki mundarija + scrollspy (qaysi bo'limdaligini ko'rsatadi)
export function ArticleToc({ toc }: { toc: TocItem[] }) {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    if (toc.length < 2) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -70% 0px", threshold: 0 },
    );
    toc.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [toc]);

  if (toc.length < 2) return null;

  return (
    <aside className="hidden w-56 flex-none xl:block">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pl-2 font-sans text-sm">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-soft">
          Shu sahifada
        </div>
        <ul className="space-y-1 border-l border-line">
          {toc.map((t) => (
            <li key={t.id} style={{ paddingLeft: t.level === 3 ? 12 : 0 }}>
              <a
                href={`#${t.id}`}
                className={
                  "-ml-px block border-l-2 py-0.5 pl-3 leading-snug transition " +
                  (active === t.id
                    ? "border-accent font-medium text-accent"
                    : "border-transparent text-soft hover:text-ink")
                }
              >
                {t.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
