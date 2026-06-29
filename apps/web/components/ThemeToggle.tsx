"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as
        | "light"
        | "dark"
        | null) || "light";
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("wisar-theme", next);
    } catch {
      /* localStorage mavjud emas */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Yorug' / qorong'i rejim"
      title="Mavzu"
      className="grid h-9 w-9 place-items-center rounded-lg text-soft transition hover:bg-black/5 hover:text-ink"
    >
      {mounted && theme === "dark" ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  );
}
