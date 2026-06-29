"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

type Props = { code: string };

const SANDBOX_HTML = (code: string) => `<!DOCTYPE html><html><head>
<script>
  const logs = [];
  const orig = console.log.bind(console);
  console.log = (...args) => {
    orig(...args);
    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
    logs.push(text);
    window.parent.postMessage({ type: 'log', text }, '*');
  };
  console.error = (...args) => {
    const text = '[xato] ' + args.map(String).join(' ');
    logs.push(text);
    window.parent.postMessage({ type: 'error', text }, '*');
  };
  window.onerror = (msg) => {
    const text = '[xato] ' + msg;
    window.parent.postMessage({ type: 'error', text }, '*');
  };
</script>
</head><body><script>
try { ${code} } catch(e) { console.error(e.message); }
</script></body></html>`;

export function CodeRunner({ code }: Props) {
  const [output, setOutput] = useState<{ type: "log" | "error"; text: string }[]>([]);
  const [ran, setRan] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "log" || e.data?.type === "error") {
        setOutput((prev) => [...prev, { type: e.data.type, text: e.data.text }]);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function run() {
    setOutput([]);
    setRan(true);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = SANDBOX_HTML(code);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={run}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
      >
        <Play size={12} /> Ishga tushir
      </button>

      {ran && (
        <div className="mt-2 rounded-lg border border-black/10 bg-black/[0.03] p-3 font-mono text-xs">
          {output.length === 0 ? (
            <span className="text-soft">Chiqish yo'q.</span>
          ) : (
            output.map((o, i) => (
              <div key={i} className={o.type === "error" ? "text-rose-600" : "text-ink"}>
                {o.text}
              </div>
            ))
          )}
        </div>
      )}

      {/* Sandboxed iframe — faqat skript bajarish uchun */}
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{ display: "none" }}
        title="code-runner"
      />
    </div>
  );
}
