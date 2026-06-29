"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bot, X, Send, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Message = { role: "user" | "assistant"; text: string };

export function AiTutor({ articleId }: { articleId: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/tutor/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, question: q }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((m) => [...m, { role: "assistant", text: data.answer || "Kechirasiz, hozir javob berolmayapman." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Server bilan bog'lanishda xato." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
      {/* Chat panel */}
      {open && (
        <div className="flex w-80 flex-col overflow-hidden rounded-2xl border border-line bg-page shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-accent/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-accent" />
              <span className="text-sm font-semibold text-ink">AI Yordam</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-soft hover:text-ink transition-colors">
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex h-72 flex-col gap-2.5 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-ink">Qanday yordam bera olaman?</p>
                <p className="mt-1 text-xs text-soft">Maqola haqida istalgan savolni yozing.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto rounded-br-sm bg-accent text-white"
                    : "mr-auto rounded-bl-sm bg-bg text-ink"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="mr-auto flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-bg px-3 py-2 text-sm text-soft">
                <Loader2 size={12} className="animate-spin" /> Javob yozilmoqda...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
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
              disabled={loading || !input.trim()}
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-accent text-white disabled:opacity-50 transition hover:opacity-90"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
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
