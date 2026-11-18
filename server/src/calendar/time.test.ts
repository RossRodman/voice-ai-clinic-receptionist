import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  fromLocal,
  isValidDate,
  offsetMinutes,
  spokenDate,
  toLocal,
  toZonedIso,
  weekdayOf,
} from "./time.ts";

const TZ = "America/Chicago";

describe("toLocal / fromLocal", () => {
  it("converts between instants and the clinic's wall clock", () => {
    const instant = new Date("2026-11-17T16:00:00Z");
    expect(toLocal(instant, TZ)).toEqual({ date: "2026-11-17", time: "10:00", minutes: 600 });
    expect(fromLocal("2026-11-17", "10:00", TZ)).toEqual(instant);
  });

  it("uses summer time in summer", () => {
    expect(fromLocal("2026-07-01", "09:00", TZ).toISOString()).toBe("2026-07-01T14:00:00.000Z");
    expect(offsetMinutes(new Date("2026-07-01T14:00:00Z"), TZ)).toBe(-300);
    expect(offsetMinutes(new Date("2026-12-01T14:00:00Z"), TZ)).toBe(-360);
  });

  it("gets both days of the clocks changing right", () => {
    // Spring forward, March 14, 2027: 9 AM is already CDT.
    expect(fromLocal("2027-03-14", "09:00", TZ).toISOString()).toBe("2027-03-14T14:00:00.000Z");
    expect(fromLocal("2027-03-13", "09:00", TZ).toISOString()).toBe("2027-03-13T15:00:00.000Z");
    // 2:30 AM doesn't exist that day: an hour later.
    expect(toLocal(fromLocal("2027-03-14", "02:30", TZ), TZ).time).toBe("03:30");
    // Fall back, November 1, 2026: 1:30 AM happens twice; the first one.
    expect(fromLocal("2026-11-01", "01:30", TZ).toISOString()).toBe("2026-11-01T06:30:00.000Z");
  });

  it("works in zones east of UTC and across midnight", () => {
    expect(fromLocal("2026-11-18", "00:30", "Europe/Kyiv").toISOString()).toBe(
      "2026-11-17T22:30:00.000Z",
    );
    expect(toLocal(new Date("2026-11-18T03:00:00Z"), TZ).date).toBe("2026-11-17");
  });
});

describe("dates", () => {
  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-11-17", "2027-01-16")).toBe(60);
  });

  it("knows the weekday", () => {
    expect(weekdayOf("2026-11-17")).toBe("tue");
    expect(weekdayOf("2026-11-22")).toBe("sun");
    expect(weekdayOf("2026-11-23")).toBe("mon");
  });

  it("rejects dates that don't exist", () => {
    expect(isValidDate("2026-11-17")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("17/11/2026")).toBe(false);
  });
});

describe("formatting", () => {
  it("writes ISO 8601 with the zone's offset", () => {
    expect(toZonedIso(new Date("2026-11-19T15:00:00Z"), TZ)).toBe("2026-11-19T09:00:00-06:00");
    expect(toZonedIso(new Date("2026-07-01T14:00:00Z"), TZ)).toBe("2026-07-01T09:00:00-05:00");
    expect(toZonedIso(new Date("2026-07-01T14:00:00Z"), "Asia/Kolkata")).toBe(
      "2026-07-01T19:30:00+05:30",
    );
  });

  it("says the date the way people do", () => {
    expect(spokenDate("2026-11-19")).toBe("Thursday, November 19");
  });
});
