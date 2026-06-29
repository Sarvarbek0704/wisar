"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";

/**
 * Maqolani brauzer ovozi bilan o'qiydi (22-vazifa) — Web Speech API.
 * Play/Pause/To'xtatish + tezlik. Matnni `#reader .prose-book` dan oladi.
 */
export function ArticleAudio() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const chunks = useRef<string[]>([]);
  const idx = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function collectText(): string {
    const el = document.querySelector<HTMLElement>(".prose-book");
    if (!el) return "";
    // Kod bloklari va interaktiv inputlarni o'qimaymiz
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("pre, code, .code-runner-portal, input, button").forEach((n) => n.remove());
    return clone.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  function speakFrom(i: number) {
    const synth = window.speechSynthesis;
    if (i >= chunks.current.length) {
      setSpeaking(false);
      setPaused(false);
      idx.current = 0;
      return;
    }
    idx.current = i;
    const u = new SpeechSynthesisUtterance(chunks.current[i]);
    u.lang = "en-US";
    u.rate = rate;
    u.onend = () => speakFrom(i + 1);
    u.onerror = () => setSpeaking(false);
    synth.speak(u);
  }

  function start() {
    const text = collectText();
    if (!text) return;
    // Jumlalarga bo'lamiz (uzun matn uchun barqaror)
    chunks.current = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    window.speechSynthesis.cancel();
    setSpeaking(true);
    setPaused(false);
    speakFrom(0);
  }

  function togglePause() {
    const synth = window.speechSynthesis;
    if (paused) {
      synth.resume();
      setPaused(false);
    } else {
      synth.pause();
      setPaused(true);
    }
  }

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    idx.current = 0;
  }

  function changeRate(r: number) {
    setRate(r);
    if (speaking) {
      // Joriy jumladan yangi tezlik bilan davom etamiz
      window.speechSynthesis.cancel();
      speakFrom(idx.current);
    }
  }

  if (!supported) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-2 py-1.5 font-sans">
      {!speaking ? (
        <button
          onClick={start}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-soft transition hover:text-accent"
          title="Maqolani tinglash"
        >
          <Volume2 size={15} /> Tinglash
        </button>
      ) : (
        <>
          <button onClick={togglePause} className="text-soft hover:text-accent" title={paused ? "Davom" : "Pauza"}>
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button onClick={stop} className="text-soft hover:text-danger" title="To'xtatish">
            <Square size={14} />
          </button>
          <select
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
            className="ml-1 rounded border border-line bg-bg px-1 py-0.5 text-xs text-ink outline-none"
            title="Tezlik"
          >
            <option value={0.75}>0.75×</option>
            <option value={1}>1×</option>
            <option value={1.25}>1.25×</option>
            <option value={1.5}>1.5×</option>
          </select>
        </>
      )}
    </div>
  );
}
