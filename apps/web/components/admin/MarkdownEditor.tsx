"use client";

import { useMemo, useState } from "react";
import { renderMarkdown } from "@wisar/content";

export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const html = useMemo(
    () => (tab === "preview" ? renderMarkdown(value || "") : ""),
    [tab, value],
  );

  const tabCls = (active: boolean) =>
    "px-4 py-2 font-sans text-sm transition " +
    (active
      ? "border-b-2 border-accent font-semibold text-accent"
      : "text-soft hover:text-ink");

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="flex border-b border-line bg-bg">
        <button type="button" onClick={() => setTab("write")} className={tabCls(tab === "write")}>
          Yozish
        </button>
        <button type="button" onClick={() => setTab("preview")} className={tabCls(tab === "preview")}>
          Ko'rish
        </button>
      </div>
      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Markdown kontent... (# Sarlavha, **qalin**, kod bloklari, jadvallar)"
          spellCheck={false}
          className="h-[60vh] w-full resize-y bg-page p-4 font-mono text-sm leading-relaxed text-ink outline-none"
        />
      ) : (
        <div
          className="prose-book max-h-[60vh] overflow-auto bg-page p-6"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
