"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { createThread, askStream, type TutorMessage } from "@/lib/tutor-api";

export function AiTutor({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const threadId = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  async function ensureThread(): Promise<string> {
    if (threadId.current) return threadId.current;
    const t = await createThread("tutor", { articleId });
    threadId.current = t.id;
    return t.id;
  }

  async function send() {
    const q = input.trim();
    if (!q || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const id = await ensureThread();
      let acc = "";
      for await (const delta of askStream(id, q)) {
        acc += delta;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
      if (!acc) {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Kechirasiz, hozir javob berolmayapman. (AI sozlanmagan bo'lishi mumkin.)",
          };
          return copy;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: (e as Error).message || "Xato yuz berdi." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-20 right-4 z-[60] flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
      {open && (
        <div className="flex w-[min(20rem,calc(100vw_-_2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-page shadow-2xl">
          <div className="flex items-center justify-between border-b border-line bg-accent/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-accent" />
              <span className="text-sm font-semibold text-ink">AI Yordam</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-soft transition-colors hover:text-ink">
              <X size={15} />
            </button>
          </div>

          <div className="flex h-72 flex-col gap-2.5 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-ink">Qanday yordam bera olaman?</p>
                <p className="mt-1 text-xs text-soft">
                  Maqola va butun kurs bo'yicha ketma-ket savol bering — kontekst saqlanadi.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto rounded-br-sm bg-accent text-white"
                    : "mr-auto rounded-bl-sm bg-bg text-ink"
                }`}
              >
                {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.content === "" && (
              <div className="mr-auto flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-bg px-3 py-2 text-sm text-soft">
                <Loader2 size={12} className="animate-spin" /> Javob yozilmoqda...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t border-line p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Savol yozing..."
              className="flex-1 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-accent text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        title="AI Yordam"
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 ${
          open ? "bg-ink text-page" : "bg-accent text-white"
        }`}
      >
        {open ? <X size={20} /> : <Bot size={22} />}
      </button>
    </div>,
    document.body,
  );
}
