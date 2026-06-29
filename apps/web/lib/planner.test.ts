import { describe, it, expect } from "vitest";
import {
  dateKey,
  addDays,
  weekDates,
  lastNDays,
  toMin,
  dayCompletion,
  habitStreak,
  type DayData,
  type Habit,
} from "./planner";

describe("dateKey", () => {
  it("YYYY-MM-DD formatida qaytaradi (oy/kun 0-to'ldirilgan)", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("addDays", () => {
  it("kun qo'shadi va manbani o'zgartirmaydi", () => {
    const base = new Date(2026, 0, 1);
    expect(dateKey(addDays(base, 5))).toBe("2026-01-06");
    expect(dateKey(addDays(base, -1))).toBe("2025-12-31");
    expect(dateKey(base)).toBe("2026-01-01"); // mutatsiya yo'q
  });
});

describe("weekDates", () => {
  it("dushanbadan boshlanadigan 7 kun qaytaradi", () => {
    // 2026-06-29 = dushanba
    const week = weekDates(new Date(2026, 5, 29));
    expect(week).toHaveLength(7);
    expect(dateKey(week[0])).toBe("2026-06-29"); // dushanba
    expect(dateKey(week[6])).toBe("2026-07-05"); // yakshanba
  });

  it("yakshanba uchun ham o'sha haftaning dushanbasini topadi", () => {
    // 2026-07-05 = yakshanba
    const week = weekDates(new Date(2026, 6, 5));
    expect(dateKey(week[0])).toBe("2026-06-29");
  });
});

describe("lastNDays", () => {
  it("oxirgi N kunni o'sish tartibida qaytaradi (oxirgisi bugun)", () => {
    const days = lastNDays(new Date(2026, 0, 10), 3);
    expect(days.map(dateKey)).toEqual(["2026-01-08", "2026-01-09", "2026-01-10"]);
  });
});

describe("toMin", () => {
  it("HH:MM ni daqiqaga aylantiradi", () => {
    expect(toMin("00:00")).toBe(0);
    expect(toMin("01:30")).toBe(90);
    expect(toMin("23:59")).toBe(1439);
  });
});

describe("dayCompletion", () => {
  const habits: Habit[] = [{ id: "h1", name: "A" }, { id: "h2", name: "B" }];

  it("vazifa yoki odat bo'lmasa 0 qaytaradi", () => {
    const day: DayData = { blocks: [], tasks: [], note: "" };
    expect(dayCompletion(day, [], {})).toBe(0);
  });

  it("bajarilgan vazifa+odat ulushini hisoblaydi", () => {
    const day: DayData = {
      blocks: [],
      tasks: [
        { id: "t1", text: "x", done: true, priority: false },
        { id: "t2", text: "y", done: false, priority: false },
      ],
      note: "",
    };
    // 2 task (1 done) + 2 habit (1 done) = 2/4 = 0.5
    expect(dayCompletion(day, habits, { h1: true })).toBe(0.5);
  });

  it("hammasi bajarilsa 1 qaytaradi", () => {
    const day: DayData = {
      blocks: [],
      tasks: [{ id: "t1", text: "x", done: true, priority: false }],
      note: "",
    };
    expect(dayCompletion(day, habits, { h1: true, h2: true })).toBe(1);
  });
});

describe("habitStreak", () => {
  it("ketma-ket bajarilgan kunlarni sanaydi", () => {
    const upto = new Date(2026, 0, 10);
    const log: Record<string, Record<string, boolean>> = {
      "2026-01-10": { h1: true },
      "2026-01-09": { h1: true },
      "2026-01-08": { h1: true },
      // 2026-01-07 yo'q → uziladi
      "2026-01-06": { h1: true },
    };
    expect(habitStreak("h1", log, upto)).toBe(3);
  });

  it("bugun bajarilmagan bo'lsa ham kechagiga qaraydi", () => {
    const upto = new Date(2026, 0, 10);
    const log: Record<string, Record<string, boolean>> = {
      "2026-01-09": { h1: true },
      "2026-01-08": { h1: true },
    };
    expect(habitStreak("h1", log, upto)).toBe(2);
  });

  it("hech qachon bajarilmagan bo'lsa 0", () => {
    expect(habitStreak("h1", {}, new Date(2026, 0, 10))).toBe(0);
  });
});
