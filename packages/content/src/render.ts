import { marked } from "marked";
import hljs from "highlight.js";
import { EMOJI_TO_SVG, isEmojiCodePoint } from "./icons";

/**
 * HTML atribut qiymatini ekranlash.
 *
 * Bu SHART: quyidagi funksiyalar markdown'dan kelgan matnni to'g'ridan-to'g'ri
 * atribut ichiga qo'yadi. Ekranlashsiz `[___:javob" onfocus=alert(1) x="]`
 * yoki ```js" onload="…` kabi yozuv atributdan chiqib, o'z kodini qo'sha olardi.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** HTML matn tugunini ekranlash. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * ALLAQACHON HTML-ekranlangan matnni atributga qo'yish uchun.
 *
 * `addFillBlanks` marked chiqargan HTML ustida ishlaydi — u yerdagi `&` lar
 * allaqachon `&amp;` ga aylangan. Ularni qayta ekranlash `&amp;quot;` kabi
 * ikki karra ekranlashga olib keladi va foydalanuvchi noto'g'ri matn ko'radi.
 * Shuning uchun bu yerda faqat atributdan chiqib ketadigan belgilarni yopamiz.
 */
function escapeAttrPreEscaped(value: string): string {
  return value
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---- kod bloklarini highlight qilish (kitobdagi build.mjs bilan bir xil) ----
function highlightCode(code: string, lang?: string): string {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch {
    return code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}

const renderer: Partial<import("marked").RendererObject> = {
  code(arg: any, infostring?: string) {
    let code: string;
    let lang: string;
    if (arg && typeof arg === "object") {
      code = arg.text;
      lang = (arg.lang || "").split(/\s+/)[0];
    } else {
      code = arg;
      lang = (infostring || "").split(/\s+/)[0];
    }
    const html = highlightCode(code, lang);
    // lang markdown info-string'dan keladi (```js...) — ekranlanmasa
    // ```js" onload="alert(1) kabi yozuv atributdan chiqib ketardi.
    const label = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : "";
    return `<div class="code-wrap">${label}<pre><code class="hljs language-${escapeAttr(lang || "")}">${html}</code></pre></div>\n`;
  },
};

marked.use({ gfm: true, breaks: false, renderer: renderer as any });

// ---- emoji -> premium ikonka, qolganini olib tashlash ----
function replaceEmojis(html: string): string {
  // 1) ma'lum emojilarni SVG ikonkaga almashtiramiz
  for (const [emoji, icon] of Object.entries(EMOJI_TO_SVG)) {
    if (html.includes(emoji)) {
      html = html.split(emoji).join(icon);
    }
  }
  // 2) qolgan (xaritada yo'q) emojilarni butunlay olib tashlaymiz
  let out = "";
  for (const ch of html) {
    const c = ch.codePointAt(0);
    if (c !== undefined && isEmojiCodePoint(c)) continue;
    out += ch;
  }
  return out;
}

// Sarlavha matnidan barqaror ID (anchor) yasaymiz
function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9À-ɏ]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return s || "bolim";
}

// h2/h3 ga ID qo'shamiz (TOC va scrollspy uchun), takrorlanmas
function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(
    /<(h[23])>([\s\S]*?)<\/\1>/g,
    (_m, tag: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      let id = slugify(text);
      const n = seen.get(id) || 0;
      seen.set(id, n + 1);
      if (n > 0) id = `${id}-${n}`;
      return `<${tag} id="${id}">${inner}</${tag}>`;
    },
  );
}

export type TocItem = { id: string; text: string; level: number };

/** Render qilingan HTML'dan ichki mundarija (h2/h3) ajratamiz. */
export function extractTocFromHtml(html: string): TocItem[] {
  const items: TocItem[] = [];
  const re = /<(h[23]) id="([^"]+)">([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    items.push({
      id: m[2],
      text: m[3].replace(/<[^>]+>/g, "").trim(),
      level: m[1] === "h2" ? 2 : 3,
    });
  }
  return items;
}

// (N.N) ko'rinishidagi o'zaro havolalar → styled badge
// Misol: (3.2) → <a href="#bob-3-2" class="cross-ref">3.2-bob</a>
function addCrossRefs(html: string): string {
  // HTML teglar ichida emas, matn qismida amal qiladi.
  // Haqiqiy navigatsiya client'da (CrossRefNav) data-ch/data-art bo'yicha amalga oshiriladi (26-vazifa).
  return html.replace(
    /(?<![<"a-z])(?<!\d)\((\d+)\.(\d+)\)(?!\s*[<>])/g,
    (_m, chap: string, art: string) =>
      `<a class="cross-ref" role="link" tabindex="0" data-ch="${chap}" data-art="${art}" title="${chap}-bo'lim, ${art}-bobga o'tish">${chap}.${art}-bob</a>`,
  );
}

// [___] → interaktiv to'ldirish maydoni
// [___:javob] → javob tekshiriladigan maydon
function addFillBlanks(html: string): string {
  // [___:javob] — javob ko'rsatilmaydi, tekshirish kerak
  html = html.replace(
    /\[___:([^\]]+)\]/g,
    (_m, answer: string) =>
      `<span class="fill-blank-wrap"><input type="text" class="fill-blank" data-answer="${escapeAttrPreEscaped(answer.trim())}" placeholder="..." autocomplete="off" spellcheck="false" /><span class="fill-blank-fb"></span></span>`,
  );
  // [___] — faqat kiritish, javobsiz
  html = html.replace(
    /\[___\]/g,
    `<input type="text" class="fill-blank fill-blank-open" placeholder="..." autocomplete="off" spellcheck="false" />`,
  );
  return html;
}

/** Markdown -> HTML (premium ikonkalar, emojisiz, sarlavha ID'lari, fill-in-blank, cross-ref bilan). */
export function renderMarkdown(md: string): string {
  let html = marked.parse(md) as string;
  html = replaceEmojis(html);
  html = addHeadingIds(html);
  html = addCrossRefs(html);
  html = addFillBlanks(html);
  return html;
}

/** Markdown'dan toza matn (tavsif/SEO uchun). */
export function toPlainText(md: string, max = 160): string {
  let s = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>|-]/g, " ")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  // emojini olib tashlash
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c !== undefined && isEmojiCodePoint(c)) continue;
    out += ch;
  }
  out = out.trim();
  return out.length > max ? out.slice(0, max).trimEnd() + "..." : out;
}
