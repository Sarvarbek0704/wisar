import { sm2, DAY_MS, type Sm2State } from "./sm2";

const fresh: Sm2State = { interval: 1, easeFactor: 2.5, reps: 0 };
const NOW = new Date("2026-01-01T00:00:00.000Z");

describe("sm2", () => {
  it("birinchi to'g'ri javobda interval 1 kun bo'ladi", () => {
    const r = sm2(fresh, 5, NOW);
    expect(r.reps).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.nextReview.getTime()).toBe(NOW.getTime() + 1 * DAY_MS);
  });

  it("ikkinchi to'g'ri javobda interval 6 kun bo'ladi", () => {
    const after1 = sm2(fresh, 5, NOW);
    const after2 = sm2(after1, 5, NOW);
    expect(after2.reps).toBe(2);
    expect(after2.interval).toBe(6);
  });

  it("uchinchi to'g'ri javobda interval easeFactor ga ko'payadi", () => {
    let s: Sm2State = fresh;
    s = sm2(s, 5, NOW); // 1
    s = sm2(s, 5, NOW); // 6
    const third = sm2(s, 5, NOW);
    expect(third.reps).toBe(3);
    expect(third.interval).toBe(Math.round(6 * s.easeFactor));
    expect(third.interval).toBeGreaterThan(6);
  });

  it("noto'g'ri javob (quality<3) reps va intervalni qayta tiklaydi", () => {
    let s: Sm2State = fresh;
    s = sm2(s, 5, NOW);
    s = sm2(s, 5, NOW); // interval 6, reps 2
    const failed = sm2(s, 1, NOW);
    expect(failed.reps).toBe(0);
    expect(failed.interval).toBe(1);
  });

  it("easeFactor 1.3 dan pastga tushmaydi", () => {
    let s: Sm2State = { interval: 1, easeFactor: 1.3, reps: 5 };
    s = sm2(s, 3, NOW); // q=3 EF kamayadi
    expect(s.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("yuqori sifat easeFactor ni oshiradi, past sifat kamaytiradi", () => {
    const up = sm2(fresh, 5, NOW);
    const down = sm2(fresh, 3, NOW);
    expect(up.easeFactor).toBeGreaterThan(down.easeFactor);
  });

  it("quality 0..5 oralig'iga qisib qo'yiladi (clamp)", () => {
    const over = sm2(fresh, 9, NOW);
    const under = sm2(fresh, -3, NOW);
    expect(over.interval).toBe(1); // 5 kabi ishlaydi
    expect(under.interval).toBe(1); // 0 kabi: reset
    expect(under.reps).toBe(0);
  });
});
