import { parseJson } from "./parse-json";

describe("parseJson", () => {
  it("toza JSON ni o'qiydi", () => {
    expect(parseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("```json fence ichidagi JSON ni o'qiydi", () => {
    const text = 'Mana natija:\n```json\n{"band": 7.5}\n```\nrahmat';
    expect(parseJson<{ band: number }>(text)).toEqual({ band: 7.5 });
  });

  it("oddiy ``` fence ni ham o'qiydi", () => {
    const text = "```\n{\"ok\": true}\n```";
    expect(parseJson<{ ok: boolean }>(text)).toEqual({ ok: true });
  });

  it("matn orasidagi JSON obyektni ajratadi", () => {
    const text = 'Javob: {"x": [1,2,3]} — shu.';
    expect(parseJson<{ x: number[] }>(text)).toEqual({ x: [1, 2, 3] });
  });

  it("JSON massivni o'qiydi", () => {
    const text = 'Savollar: [{"q":"a"},{"q":"b"}]';
    expect(parseJson<{ q: string }[]>(text)).toEqual([{ q: "a" }, { q: "b" }]);
  });

  it("yaroqsiz JSON da xato tashlaydi", () => {
    expect(() => parseJson("salom, bu json emas")).toThrow();
  });
});
