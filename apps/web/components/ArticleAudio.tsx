"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2 } from "lucide-react";

/**
 * Maqolani brauzer ovozi bilan o'qiydi (22-vazifa) — Web Speech API.
 *
 * TIL-OGOH (eng sifatli bepul yondashuv):
 *  - Har jumlaning tili avtomatik aniqlanadi (o'zbek / ingliz).
 *  - O'zbekcha jumla → o'zbek ovozi (bo'lsa), bo'lmasa TURKCHA ovoz (turkiy, lotin —
 *    o'zbekchani inglizchadan ko'ra ancha tushunarli o'qiydi), so'ng ruscha → fallback.
 *  - Inglizcha jumla → inglizcha ovoz (to'g'ri talaffuz — ingliz kursidagi misollar uchun).
 *  - O'zbekcha jumlalardagi raqamlar so'zga aylantiriladi ("123" → "bir yuz yigirma uch").
 */

// ── O'zbekcha sonlar (sodda, ASCII — turkcha ovoz ham yaxshi o'qiydi) ──
const ONES = ["", "bir", "ikki", "uch", "tort", "besh", "olti", "yetti", "sakkiz", "toqqiz"];
const TENS = ["", "on", "yigirma", "ottiz", "qirq", "ellik", "oltmish", "yetmish", "sakson", "toqson"];
const SCALE = ["", "ming", "million", "milliard", "trillion"];

function uz3(n: number): string {
  const out: string[] = [];
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), o = n % 10;
  if (h) out.push(ONES[h], "yuz");
  if (t) out.push(TENS[t]);
  if (o) out.push(ONES[o]);
  return out.join(" ").trim();
}
function uzNum(n: number): string {
  if (n === 0) return "nol";
  const groups: number[] = [];
  let x = n;
  while (x > 0) { groups.push(x % 1000); x = Math.floor(x / 1000); }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue;
    parts.push((uz3(groups[i]) + " " + SCALE[i]).trim());
  }
  return parts.join(" ").trim();
}
function digitWord(d: string): string {
  return d === "0" ? "nol" : ONES[Number(d)] || d;
}
/** O'zbekcha matndagi raqamlarni so'zga aylantiradi. */
function uzberizeNumbers(text: string): string {
  return text.replace(/\d+(?:[.,]\d+)?/g, (m) => {
    if (/[.,]/.test(m)) {
      const [int, frac] = m.split(/[.,]/);
      const ip = parseInt(int, 10);
      const intW = isNaN(ip) ? int : uzNum(ip);
      const fracW = frac.split("").map(digitWord).join(" ");
      return `${intW} nuqta ${fracW}`;
    }
    const n = parseInt(m, 10);
    if (isNaN(n) || n > 1e12) return m;
    return uzNum(n);
  });
}

// ── Til aniqlash (o'zbekchaga moyil — platforma o'zbekcha) ──
const UZ_RE = /\b(va|bilan|uchun|ham|bu|shu|yoki|lekin|ammo|agar|chunki|ya'?ni|har|nima|qanday|emas|edi|ekan|kerak|mumkin|degan|quyidagi|hisoblanadi|misol|qiymat|hamda|yana|faqat)\b/gi;
const UZ_APOS_RE = /(o['ʻ`’]|g['ʻ`’])/i; // o', g' — o'zbekka xos
const EN_RE = /\b(the|and|or|is|are|was|were|be|been|to|of|in|on|for|with|that|this|it|you|have|has|had|will|can|do|does|not|but|as|at|by|from|your|they|we|an?|i)\b/gi;

function detectLang(s: string): "uz" | "en" {
  const uzWords = (s.match(UZ_RE) || []).length;
  const enWords = (s.match(EN_RE) || []).length;
  const uzApos = UZ_APOS_RE.test(s);
  // Faqat aniq inglizcha (2+ inglizcha so'z, o'zbekchadan ko'p, o'zbek apostrofisiz) → en
  if (enWords >= 2 && enWords > uzWords && !uzApos) return "en";
  return "uz";
}

type Seg = { text: string; lang: "uz" | "en" };

export function ArticleAudio() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [uzReal, setUzReal] = useState(true); // haqiqiy o'zbek ovozi bormi?
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const segs = useRef<Seg[]>([]);
  const idx = useRef(0);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (!ok) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
      setUzReal(voicesRef.current.some((v) => /^uz/i.test(v.lang)));
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  /** Til uchun eng sifatli mavjud ovozni tanlaydi. */
  function pickVoice(lang: "uz" | "en"): SpeechSynthesisVoice | null {
    const vs = voicesRef.current;
    const best = (re: RegExp) =>
      vs.find((v) => re.test(v.lang) && /natural|online|google|neural|microsoft/i.test(v.name)) ||
      vs.find((v) => re.test(v.lang)) || null;
    if (lang === "en") return best(/^en/i);
    // o'zbek → turk → rus
    return (
      vs.find((v) => /^uz/i.test(v.lang)) ||
      best(/^tr/i) ||
      best(/^ru/i) ||
      best(/^en/i)
    );
  }

  function collectText(): string {
    const el = document.querySelector<HTMLElement>(".prose-book");
    if (!el) return "";
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("pre, code, .code-runner-portal, input, button").forEach((n) => n.remove());
    return clone.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  function speakFrom(i: number) {
    const synth = window.speechSynthesis;
    if (i >= segs.current.length) {
      setSpeaking(false);
      setPaused(false);
      idx.current = 0;
      return;
    }
    idx.current = i;
    const seg = segs.current[i];
    const spoken = seg.lang === "uz" ? uzberizeNumbers(seg.text) : seg.text;
    const u = new SpeechSynthesisUtterance(spoken);
    const voice = pickVoice(seg.lang);
    if (voice) u.voice = voice;
    u.lang = voice?.lang || (seg.lang === "en" ? "en-US" : "uz-UZ");
    u.rate = rate;
    u.onend = () => speakFrom(i + 1);
    u.onerror = () => speakFrom(i + 1); // bitta jumla xato bo'lsa ham davom etamiz
    synth.speak(u);
  }

  function start() {
    const text = collectText();
    if (!text) return;
    const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    segs.current = sentences.map((t) => ({ text: t, lang: detectLang(t) }));
    window.speechSynthesis.cancel();
    setSpeaking(true);
    setPaused(false);
    speakFrom(0);
  }

  function togglePause() {
    const synth = window.speechSynthesis;
    if (paused) { synth.resume(); setPaused(false); }
    else { synth.pause(); setPaused(true); }
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
          title={uzReal ? "Maqolani tinglash" : "Maqolani tinglash (o'zbekcha uchun turkcha ovoz ishlatiladi — brauzerda o'zbek ovozi yo'q)"}
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
