import { describe, it, expect, beforeEach } from "vitest";
import {
  estimateBand,
  isCorrect,
  saveAttempt,
  clearAttempts,
  latestBands,
  overallBand,
} from "./ielts-progress";

describe("estimateBand", () => {
  it("0 savol uchun 0", () => {
    expect(estimateBand(0, 0)).toBe(0);
  });
  it("100% to'g'ri uchun 9", () => {
    expect(estimateBand(10, 10)).toBe(9);
  });
  it("yarmi to'g'ri uchun ~6", () => {
    expect(estimateBand(5, 10)).toBe(6);
  });
  it("juda past natija uchun 4", () => {
    expect(estimateBand(1, 10)).toBe(4);
  });
  it("foiz oshgani sari band o'sadi (monoton)", () => {
    let prev = -1;
    for (let c = 0; c <= 10; c++) {
      const b = estimateBand(c, 10);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });
});

describe("isCorrect", () => {
  it("katta-kichik harf va tinish belgilarini e'tiborsiz qoldiradi", () => {
    expect(isCorrect("True.", "true")).toBe(true);
    expect(isCorrect("  Paris ", "paris")).toBe(true);
  });
  it("TFNG qisqartmalarini tan oladi", () => {
    expect(isCorrect("T", "true")).toBe(true);
    expect(isCorrect("F", "false")).toBe(true);
    expect(isCorrect("NG", "not given")).toBe(true);
  });
  it("artikllarni (a/an/the) e'tiborsiz qoldiradi", () => {
    expect(isCorrect("the cat", "cat")).toBe(true);
    expect(isCorrect("dog", "a dog")).toBe(true);
  });
  it("bo'sh javob noto'g'ri", () => {
    expect(isCorrect("", "cat")).toBe(false);
  });
  it("noto'g'ri javobni rad etadi", () => {
    expect(isCorrect("dog", "cat")).toBe(false);
  });
});

describe("attempt log (localStorage)", () => {
  beforeEach(() => clearAttempts());

  it("urinishni saqlaydi va eng so'nggi bandni qaytaradi", () => {
    saveAttempt({ skill: "writing", band: 6.5, date: "2026-01-01" });
    saveAttempt({ skill: "writing", band: 7, date: "2026-01-02" });
    expect(latestBands().writing).toBe(7);
  });

  it("overallBand 4 ko'nikma o'rtachasini 0.5 ga yaxlitlaydi", () => {
    saveAttempt({ skill: "writing", band: 7, date: "d" });
    saveAttempt({ skill: "speaking", band: 6, date: "d" });
    saveAttempt({ skill: "reading", band: 8, date: "d" });
    saveAttempt({ skill: "listening", band: 6, date: "d" });
    // (7+6+8+6)/4 = 6.75 → 6.5/7.0? round(6.75*2)/2 = round(13.5)/2 = 14/2 = 7
    expect(overallBand()).toBe(7);
  });

  it("urinish bo'lmasa overallBand null", () => {
    expect(overallBand()).toBeNull();
  });
});
