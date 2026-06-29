"use client";

// Maqola kontentini brauzerda render qiladi va:
// 1. JS kod bloklari uchun "Ishga tushir" tugmasini qo'shadi
// 2. fill-in-blank [___] mashqlarini interaktiv qiladi

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useState } from "react";
import { CodeRunner } from "./CodeRunner";

type Props = { html: string; articleId: string };

export function ArticleContent({ html, articleId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [runners, setRunners] = useState<{ code: string; el: HTMLElement }[]>([]);

  // JS kod bloklar uchun CodeRunner portallari
  useEffect(() => {
    if (!ref.current) return;
    const blocks = ref.current.querySelectorAll<HTMLElement>(
      "pre code.language-javascript, pre code.hljs.language-javascript",
    );
    const found: { code: string; el: HTMLElement }[] = [];
    blocks.forEach((block) => {
      const pre = block.closest("pre");
      if (!pre?.parentElement) return;
      const code = block.textContent || "";
      // Wrapper div yaratamiz CodeRunner uchun
      const wrap = document.createElement("div");
      wrap.className = "code-runner-portal";
      pre.parentElement.insertBefore(wrap, pre.nextSibling);
      found.push({ code, el: wrap });
    });
    setRunners(found);
  }, [html]);

  // Fill-in-blank interaktivligi
  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;

    function checkInput(input: HTMLInputElement) {
      const answer = input.dataset.answer;
      if (!answer) return;
      const val = input.value.trim().toLowerCase();
      const correct = answer.trim().toLowerCase();
      if (!val) {
        input.classList.remove("correct", "wrong");
        const fb = input.nextElementSibling as HTMLElement | null;
        if (fb) fb.textContent = "";
        return;
      }
      const ok = val === correct;
      input.classList.toggle("correct", ok);
      input.classList.toggle("wrong", !ok);
      const fb = input.nextElementSibling as HTMLElement | null;
      if (fb) fb.textContent = ok ? "+" : "x";
    }

    function handler(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.classList.contains("fill-blank") && input.dataset.answer) {
        checkInput(input);
      }
    }

    container.addEventListener("input", handler);
    return () => container.removeEventListener("input", handler);
  }, [html]);

  return (
    <>
      <div
        ref={ref}
        className="prose-book"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {runners.map(({ code, el }, i) =>
        createPortal(<CodeRunner key={i} code={code} />, el),
      )}
    </>
  );
}
