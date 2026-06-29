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
  const [runners, setRunners] = useState<
    { code: string; el: HTMLElement; language: "javascript" | "python" }[]
  >([]);

  // JS va Python kod bloklar uchun CodeRunner portallari (25-vazifa)
  useEffect(() => {
    if (!ref.current) return;
    const blocks = ref.current.querySelectorAll<HTMLElement>(
      "pre code.language-javascript, pre code.language-python",
    );
    const found: { code: string; el: HTMLElement; language: "javascript" | "python" }[] = [];
    blocks.forEach((block) => {
      const pre = block.closest("pre");
      if (!pre?.parentElement) return;
      const code = block.textContent || "";
      const language = block.classList.contains("language-python") ? "python" : "javascript";
      const wrap = document.createElement("div");
      wrap.className = "code-runner-portal";
      pre.parentElement.insertBefore(wrap, pre.nextSibling);
      found.push({ code, el: wrap, language });
    });
    setRunners(found);
  }, [html]);

  // Fill-in-blank interaktivligi (9-vazifa): yashil/qizil + xato bo'lsa to'g'ri javob
  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;

    function feedback(input: HTMLInputElement): HTMLElement | null {
      return input.nextElementSibling as HTMLElement | null;
    }

    function checkInput(input: HTMLInputElement, reveal: boolean) {
      const answer = input.dataset.answer;
      if (!answer) return;
      const val = input.value.trim().toLowerCase();
      const correct = answer.trim().toLowerCase();
      const fb = feedback(input);
      if (!val) {
        input.classList.remove("correct", "wrong");
        if (fb) {
          fb.textContent = "";
          fb.classList.remove("correct", "wrong");
        }
        return;
      }
      const ok = val === correct;
      input.classList.toggle("correct", ok);
      input.classList.toggle("wrong", !ok);
      if (fb) {
        fb.classList.toggle("correct", ok);
        fb.classList.toggle("wrong", !ok);
        // Xato bo'lsa va fokus yo'qolganda to'g'ri javobni ko'rsatamiz
        fb.textContent = ok ? "✓" : reveal ? `✗ ${answer.trim()}` : "✗";
      }
    }

    function onInput(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.classList?.contains("fill-blank") && input.dataset.answer) {
        checkInput(input, false);
      }
    }
    function onBlur(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.classList?.contains("fill-blank") && input.dataset.answer) {
        checkInput(input, true);
      }
    }

    container.addEventListener("input", onInput);
    container.addEventListener("blur", onBlur, true);
    return () => {
      container.removeEventListener("input", onInput);
      container.removeEventListener("blur", onBlur, true);
    };
  }, [html]);

  return (
    <>
      <div
        ref={ref}
        className="prose-book"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {runners.map(({ code, el, language }, i) =>
        createPortal(<CodeRunner key={i} code={code} language={language} />, el),
      )}
    </>
  );
}
