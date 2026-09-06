import { formatPhone, isNormalizedPhone, looksLikeEmail, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("turli ko'rinishlarni bitta natijaga keltiradi", () => {
    // Bir odam raqamini har xil yozishi mumkin — hammasi bitta qiymat bo'lishi
    // SHART, aks holda @unique ishlamaydi va ikkita hisob ochilib ketadi.
    const kutilgan = "998901234567";
    for (const variant of [
      "+998901234567",
      "998901234567",
      "+998 90 123 45 67",
      "998 90 123-45-67",
      "(90) 123 45 67",
      "901234567",
      "8 90 123 45 67",
      "00998901234567",
    ]) {
      expect(normalizePhone(variant)).toBe(kutilgan);
    }
  });

  it("barcha mobil operator kodlarini qabul qiladi", () => {
    for (const p of ["20", "33", "50", "55", "77", "88", "90", "91", "93", "94", "95", "97", "98", "99"]) {
      expect(normalizePhone(`998${p}1234567`)).toBe(`998${p}1234567`);
    }
  });

  it("shahar va xizmat raqamlarini rad etadi", () => {
    // Bularga Telegram/SMS bormaydi — tasdiqlab bo'lmaydi.
    expect(normalizePhone("998712345678")).toBeNull(); // Toshkent shahar
    expect(normalizePhone("998691234567")).toBeNull(); // viloyat
  });

  it("yaroqsiz kiritishlarni rad etadi", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("salom")).toBeNull();
    expect(normalizePhone("99890123456")).toBeNull(); // bitta raqam kam
    expect(normalizePhone("9989012345678")).toBeNull(); // bitta raqam ortiq
    expect(normalizePhone("+7 900 123 45 67")).toBeNull(); // boshqa mamlakat
  });
});

describe("isNormalizedPhone", () => {
  it("faqat bazadagi ko'rinishni tan oladi", () => {
    expect(isNormalizedPhone("998901234567")).toBe(true);
    expect(isNormalizedPhone("+998901234567")).toBe(false);
    expect(isNormalizedPhone("998711234567")).toBe(false);
  });
});

describe("formatPhone", () => {
  it("o'qish uchun chiroyli ko'rinish beradi", () => {
    expect(formatPhone("998901234567")).toBe("+998 90 123 45 67");
  });

  it("noto'g'ri qiymatni o'zgartirmaydi", () => {
    expect(formatPhone("salom")).toBe("salom");
  });
});

describe("looksLikeEmail", () => {
  it("kirish maydonidagi qiymat turini ajratadi", () => {
    expect(looksLikeEmail("a@b.uz")).toBe(true);
    expect(looksLikeEmail("998901234567")).toBe(false);
    expect(looksLikeEmail("+998 90 123 45 67")).toBe(false);
  });
});
