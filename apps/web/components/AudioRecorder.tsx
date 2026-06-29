"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { transcribeAudio } from "@/lib/ielts-api";

/**
 * Real audio yozib olib Whisper bilan transkripsiya qiladi (20-vazifa).
 * Whisper sozlanmagan bo'lsa — yumshoq xato (foydalanuvchi qo'lda yozadi / Web Speech).
 */
export function AudioRecorder({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Brauzer mikrofonni qo'llab-quvvatlamaydi.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setProcessing(true);
        try {
          const { text } = await transcribeAudio(blob);
          if (text) onTranscript(text);
          else setError("Transkripsiya bo'sh qaytdi.");
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setProcessing(false);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setError("Mikrofonga ruxsat berilmadi.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="inline-flex flex-col gap-1">
      {!recording ? (
        <button
          type="button"
          onClick={start}
          disabled={processing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-soft transition hover:text-accent disabled:opacity-50"
        >
          {processing ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
          {processing ? "Transkripsiya..." : "Audio yozib yuborish"}
        </button>
      ) : (
        <button
          type="button"
          onClick={stop}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 dark:bg-rose-500/10"
        >
          <Square size={14} /> To'xtatish
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
