"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Highlighter as HlIcon, StickyNote } from "lucide-react";
import { isLoggedIn } from "@/lib/auth";
import {
  getHighlights,
  createHighlight,
  deleteHighlight,
  type Highlight,
} from "@/lib/me-api";
import { toast, confirmDialog } from "@/lib/ui";

type Pop = { x: number; y: number; quote: string; prefix: string };

function container(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".prose-book");
}

function skipNode(node: Text): boolean {
  const p = node.parentElement;
  return !!p?.closest("pre, code, .code-runner-portal, mark, .fill-blank-wrap");
}

function wrapQuote(root: HTMLElement, h: Pick<Highlight, "id" | "quote" | "prefix" | "note" | "color">, onDelete: (id: string) => void) {
  if (root.querySelector(`[data-hl="${h.id}"]`)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    if (!skipNode(node)) {
      const text = node.textContent ?? "";
      const idx = text.indexOf(h.quote);
      if (idx !== -1) {
        const before = text.slice(0, idx);
        const prefixOk = !h.prefix || before.endsWith(h.prefix) || before.length === 0;
        if (prefixOk) {
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + h.quote.length);
          const mark = document.createElement("mark");
          mark.className = `hl hl-${h.color || "yellow"}`;
          mark.dataset.hl = h.id;
          if (h.note) mark.title = h.note;
          try {
            range.surroundContents(mark);
            mark.addEventListener("click", async (e) => {
              e.stopPropagation();
              const msg = h.note ? `Izoh: "${h.note}"\n\nO'chirasizmi?` : "Belgini o'chirasizmi?";
              if (await confirmDialog(msg)) onDelete(h.id);
            });
          } catch {
            // surroundContents element chegaralaridan o'tsa — o'tkazib yuboramiz
          }
          return;
        }
      }
    }
    node = walker.nextNode() as Text | null;
  }
}

/** Matn belgilash + inline izoh (24-vazifa, Kindle uslubi). */
export function Highlighter({ articleId }: { articleId: string }) {
  const [pop, setPop] = useState<Pop | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [note, setNote] = useState("");

  function removeHighlight(id: string) {
    deleteHighlight(id).catch(() => {});
    const el = container()?.querySelector(`[data-hl="${id}"]`);
    if (el) {
      const parent = el.parentNode;
      while (el.firstChild) parent?.insertBefore(el.firstChild, el);
      parent?.removeChild(el);
    }
  }

  useEffect(() => {
    if (!isLoggedIn()) return;
    getHighlights(articleId)
      .then((hls) => {
        const root = container();
        if (root) hls.forEach((h) => wrapQuote(root, h, removeHighlight));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  useEffect(() => {
    function onMouseUp() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      const root = container();
      if (!text || text.length < 2 || text.length > 600 || !root) return;
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return;
      let prefix = "";
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        prefix = (range.startContainer.textContent ?? "").slice(
          Math.max(0, range.startOffset - 30),
          range.startOffset,
        );
      }
      const rect = range.getBoundingClientRect();
      setPop({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 8,
        quote: sel.toString(),
        prefix,
      });
      setNoteMode(false);
      setNote("");
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  async function save(withNote: boolean) {
    if (!pop) return;
    try {
      const h = await createHighlight({
        articleId,
        quote: pop.quote,
        prefix: pop.prefix,
        note: withNote ? note.trim() || undefined : undefined,
      });
      const root = container();
      if (root) wrapQuote(root, h, removeHighlight);
    } catch (e) {
      toast((e as Error).message, "error");
    }
    setPop(null);
    setNoteMode(false);
    setNote("");
    window.getSelection()?.removeAllRanges();
  }

  if (!isLoggedIn() || !pop) return null;

  return createPortal(
    <div
      className="absolute z-[80] -translate-x-1/2 -translate-y-full font-sans"
      style={{ left: pop.x, top: pop.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="rounded-xl border border-line bg-page p-1.5 shadow-card">
        {!noteMode ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => save(false)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-soft hover:bg-bg hover:text-accent"
            >
              <HlIcon size={13} /> Belgilash
            </button>
            <button
              onClick={() => setNoteMode(true)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-soft hover:bg-bg hover:text-accent"
            >
              <StickyNote size={13} /> Izoh
            </button>
          </div>
        ) : (
          <div className="w-56 p-1">
            <textarea
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Izoh yozing..."
              className="h-16 w-full resize-none rounded-lg border border-line bg-bg p-2 text-xs text-ink outline-none focus:border-accent"
            />
            <button
              onClick={() => save(true)}
              className="mt-1 w-full rounded-lg bg-accent py-1 text-xs font-semibold text-white hover:opacity-90"
            >
              Saqlash
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
