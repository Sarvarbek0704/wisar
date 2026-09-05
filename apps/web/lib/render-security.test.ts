import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@wisar/content";

/**
 * Renderer markdown'dan kelgan matnni HTML atributlari ichiga qo'yadi
 * (`data-answer`, `class="language-…"`). Ekranlashsiz bu matn atributdan
 * chiqib, o'z hodisa ishlovchisini qo'sha olardi.
 *
 * Natija `dangerouslySetInnerHTML` bilan chiqariladi, ya'ni har qanday sizib
 * o'tgan atribut brauzerda haqiqatan bajariladi.
 */
describe("renderMarkdown — atribut in'yeksiyasi", () => {
  it("fill-blank javobidagi qo'shtirnoq atributdan chiqmaydi", () => {
    const html = renderMarkdown(`Bu [___:javob" onfocus="alert(1)] mashq.`);
    // Muhimi: onfocus HAQIQIY atributga aylanmasin. Qiymat ICHIDA matn
    // sifatida turishi zararsiz — brauzer uni bajarmaydi.
    expect(html).not.toMatch(/"\s+onfocus\s*=/);
    expect(html).toContain("&quot;");
    // Ikki karra ekranlash bo'lmasin — foydalanuvchi "&amp;quot;" ko'rmasin.
    expect(html).not.toContain("&amp;quot;");
  });

  it("kod bloki tilidagi qo'shtirnoq atributdan chiqmaydi", () => {
    const html = renderMarkdown('```js" onload="alert(1)\nconst a = 1;\n```');
    expect(html).not.toMatch(/"\s+onload\s*=/);
  });

  it("kod bloki tili matn sifatida ham ekranlanadi", () => {
    const html = renderMarkdown("```<img src=x onerror=alert(1)>\nkod\n```");
    expect(html).not.toContain("<img src=x");
  });

  it("oddiy markdown avvalgidek ishlaydi", () => {
    const html = renderMarkdown("## Sarlavha\n\nMatn [___:javob] va `kod`.");
    expect(html).toContain("<h2");
    expect(html).toContain('data-answer="javob"');
  });
});
