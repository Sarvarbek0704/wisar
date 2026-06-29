"use client";

import { useEffect } from "react";

// Har bir kod blokiga "Nusxa" tugmasini qo'shadi
export function CopyCodeEnhancer({ trigger }: { trigger?: string }) {
  useEffect(() => {
    const wraps = document.querySelectorAll<HTMLElement>(
      ".prose-book .code-wrap",
    );
    wraps.forEach((wrap) => {
      if (wrap.querySelector(".copy-btn")) return;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.type = "button";
      btn.textContent = "Nusxa";
      btn.setAttribute("aria-label", "Kodni nusxalash");
      btn.addEventListener("click", async () => {
        const code = wrap.querySelector("pre")?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(code);
          btn.textContent = "Olindi";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = "Nusxa";
            btn.classList.remove("copied");
          }, 1500);
        } catch {
          /* clipboard yo'q */
        }
      });
      wrap.appendChild(btn);
    });
  }, [trigger]);

  return null;
}
