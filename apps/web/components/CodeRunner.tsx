"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2 } from "lucide-react";

type Lang = "javascript" | "python";
type Props = { code: string; language?: Lang };
type OutLine = { type: "log" | "error"; text: string };

const SANDBOX_HTML = (code: string) => `<!DOCTYPE html><html><head>
<script>
  const orig = console.log.bind(console);
  console.log = (...args) => {
    orig(...args);
    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
    window.parent.postMessage({ type: 'log', text }, '*');
  };
  console.error = (...args) => {
    window.parent.postMessage({ type: 'error', text: '[xato] ' + args.map(String).join(' ') }, '*');
  };
  window.onerror = (msg) => {
    window.parent.postMessage({ type: 'error', text: '[xato] ' + msg }, '*');
  };
</script>
</head><body><script>
try { ${code} } catch(e) { console.error(e.message); }
</script></body></html>`;

// ── Pyodide (Python WASM) — faqat birinchi run'da lazy yuklanadi (25-vazifa) ──
const PYODIDE_VERSION = "0.26.4";
let pyodidePromise: Promise<unknown> | null = null;

function loadPyodide(): Promise<any> {
  if (pyodidePromise) return pyodidePromise as Promise<any>;
  pyodidePromise = new Promise<any>((resolve, reject) => {
    const w = window as any;
    const init = async () => {
      try {
        const py = await w.loadPyodide({
          indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
        });
        resolve(py);
      } catch (e) {
        pyodidePromise = null;
        reject(e);
      }
    };
    if (w.loadPyodide) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;
    script.onload = init;
    script.onerror = () => {
      pyodidePromise = null;
      reject(new Error("Pyodide yuklanmadi (internet kerak)"));
    };
    document.head.appendChild(script);
  });
  return pyodidePromise as Promise<any>;
}

export function CodeRunner({ code, language = "javascript" }: Props) {
  const [output, setOutput] = useState<OutLine[]>([]);
  const [ran, setRan] = useState(false);
  const [loading, setLoading] = useState(false);
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

  function runJs() {
    setOutput([]);
    setRan(true);
    if (iframeRef.current) iframeRef.current.srcdoc = SANDBOX_HTML(code);
  }

  async function runPython() {
    setRan(true);
    setOutput([]);
    setLoading(true);
    try {
      const py = await loadPyodide();
      const logs: OutLine[] = [];
      py.setStdout({ batched: (s: string) => logs.push({ type: "log", text: s }) });
      py.setStderr({ batched: (s: string) => logs.push({ type: "error", text: "[xato] " + s }) });
      await py.runPythonAsync(code);
      setOutput(logs);
    } catch (e) {
      setOutput([{ type: "error", text: "[xato] " + (e as Error).message }]);
    } finally {
      setLoading(false);
    }
  }

  const run = language === "python" ? runPython : runJs;

  return (
    <div className="mt-2">
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        {loading ? "Python yuklanmoqda..." : "Ishga tushir"}
      </button>

      {ran && (
        <div className="mt-2 rounded-lg border border-black/10 bg-black/[0.03] p-3 font-mono text-xs dark:border-white/10 dark:bg-white/[0.04]">
          {output.length === 0 ? (
            <span className="text-soft">{loading ? "..." : "Chiqish yo'q."}</span>
          ) : (
            output.map((o, i) => (
              <div key={i} className={o.type === "error" ? "text-rose-600 dark:text-rose-400" : "text-ink"}>
                {o.text}
              </div>
            ))
          )}
        </div>
      )}

      {language === "javascript" && (
        <iframe ref={iframeRef} sandbox="allow-scripts" style={{ display: "none" }} title="code-runner" />
      )}
    </div>
  );
}
