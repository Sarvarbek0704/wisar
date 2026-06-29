import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand:   "var(--brand)",
        ink:     "var(--ink)",
        soft:    "var(--soft)",
        muted:   "var(--muted)",
        accent:     "var(--accent)",
        "accent-bg":"var(--accent-bg)",
        accent2:    "var(--accent2)",
        line:    "var(--line)",
        page:    "var(--page)",
        bg:      "var(--bg)",
        success: "var(--success)",
        danger:  "var(--danger)",
        warn:    "var(--warn)",
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-titan)", "Titan One", "Impact", "sans-serif"],
        book:    ["var(--font-trocchi)", "Trocchi", "Georgia", "serif"],
        mono:    ["Cascadia Code", "Consolas", "Courier New", "monospace"],
      },
      maxWidth: {
        page: "860px",
      },
      boxShadow: {
        card:   "0 4px 16px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04)",
        "card-lg": "0 8px 40px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)",
        brand:  "0 4px 24px rgba(11,17,29,.35)",
      },
      borderRadius: {
        DEFAULT: "6px",
        md:  "8px",
        lg:  "12px",
        xl:  "16px",
        "2xl": "20px",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(.4,0,.2,1)",
      },
      transitionDuration: {
        DEFAULT: "180ms",
      },
    },
  },
  plugins: [],
};

export default config;
