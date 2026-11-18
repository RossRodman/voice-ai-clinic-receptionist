import { beforeAll, describe, expect, it } from "vitest";
import { fromLocal } from "../calendar/time.ts";
import type { CalendarEvent } from "../calendar/types.ts";
import type { Clinic, Service } from "../clinic/schema.ts";
import { TEST_NOW, testClinic } from "../test/helpers.ts";
import {
  bookingWindow,
  candidateStarts,
  freeSlots,
  isProviderFree,
  matchesTimeOfDay,
  pickSlots,
  type Slot,
} from "./slots.ts";

let clinic: Clinic;
const service = (id: string): Service => clinic.services.find((s) => s.id === id)!;

beforeAll(async () => {
  clinic = (await testClinic()).clinic;
});

const at = (date: string, time: string) => fromLocal(date, time, clinic.timezone);
const busy = (date: string, from: string, to: string, providerId?: string): CalendarEvent => ({
  id: `${date}-${from}-${providerId ?? "all"}`,
  summary: "Busy",
  start: at(date, from),
  end: at(date, to),
  ...(providerId ? { providerId } : {}),
});
const times = (slots: readonly Pick<Slot, "time">[]) => slots.map((s) => s.time);

// TEST_NOW is Tuesday, November 17, 2026, 10:00 AM in Chicago.
const TUE = "2026-11-17";
const WED = "2026-11-18";
const FRI = "2026-11-20";
const SAT = "2026-11-21";
const SUN = "2026-11-22";

describe("bookingWindow", () => {
  it("starts after the notice period and ends maxDaysAhead from today", () => {
    expect(bookingWindow(clinic, TEST_NOW)).toEqual({
      earliest: at(TUE, "12:00"),
      today: TUE,
      lastDate: "2027-01-16",
    });
  });
});

describe("candidateStarts", () => {
  it("fills opening hours on the slot grid, ending by closing time", () => {
    const starts = times(candidateStarts(clinic, service("checkup-cleaning"), WED, TEST_NOW));
    expect(starts[0]).toBe("08:00");
    expect(starts.at(-1)).toBe("17:00"); // 60 minutes, closes at 18:00
    expect(starts).toHaveLength(19);
  });

  it("fits the visit's length into short days", () => {
    // Friday 8 AM to 3 PM, Saturday 9 AM to 1 PM; whitening takes 90 minutes.
    expect(times(candidateStarts(clinic, service("whitening"), FRI, TEST_NOW)).at(-1)).toBe(
      "13:30",
    );
    expect(times(candidateStarts(clinic, service("whitening"), SAT, TEST_NOW))).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
    ]);
  });

  it("has nothing when the clinic is closed", () => {
    expect(candidateStarts(clinic, service("emergency"), SUN, TEST_NOW)).toEqual([]);
  });

  it("leaves the notice period free today", () => {
    expect(times(candidateStarts(clinic, service("emergency"), TUE, TEST_NOW))[0]).toBe("12:00");
  });

  it("has nothing in the past or beyond the booking window", () => {
    expect(candidateStarts(clinic, service("emergency"), "2026-11-16", TEST_NOW)).toEqual([]);
    expect(candidateStarts(clinic, service("emergency"), "2027-01-16", TEST_NOW)).not.toEqual([]);
    expect(candidateStarts(clinic, service("emergency"), "2027-01-18", TEST_NOW)).toEqual([]);
  });

  it("follows a custom slot grid", () => {
    const quarterHours = { ...clinic, booking: { ...clinic.booking, slotMinutes: 15 } };
    expect(times(candidateStarts(quarterHours, service("emergency"), SAT, TEST_NOW))).toHaveLength(
      15,
    );
  });

  it("handles split hours, e.g. a lunch break", () => {
    const split = {
      ...clinic,
      hours: {
        ...clinic.hours,
        wed: [
          ["08:00", "12:00"],
          ["13:00", "15:00"],
        ] as [string, string][],
      },
    };
    const starts = times(candidateStarts(split, service("checkup-cleaning"), WED, TEST_NOW));
    expect(starts).toContain("11:00");
    expect(starts).not.toContain("11:30");
    expect(starts).not.toContain("12:00");
    expect(starts).toContain("13:00");
    expect(starts.at(-1)).toBe("14:00");
  });
});

describe("isProviderFree", () => {
  let events: CalendarEvent[];
  beforeAll(() => {
    events = [busy(WED, "09:00", "10:00", "dr-carter"), busy(WED, "12:00", "13:00")];
  });

  it("checks the provider's own events", () => {
    expect(isProviderFree(events, "dr-carter", at(WED, "09:30"), at(WED, "10:00"))).toBe(false);
    expect(isProviderFree(events, "dr-okafor", at(WED, "09:30"), at(WED, "10:00"))).toBe(true);
  });

  it("lets a visit start the minute the previous one ends", () => {
    expect(isProviderFree(events, "dr-carter", at(WED, "10:00"), at(WED, "11:00"))).toBe(true);
    expect(isProviderFree(events, "dr-carter", at(WED, "08:00"), at(WED, "09:00"))).toBe(true);
  });

  it("treats events without a provider as blocking everyone", () => {
    expect(isProviderFree(events, "dr-okafor", at(WED, "11:30"), at(WED, "12:30"))).toBe(false);
  });
});

describe("freeSlots", () => {
  it("leaves out times that overlap the visit, not only its start", () => {
    // A 60-minute cleaning at 9:30 would run into a 10:00 appointment.
    const events = [busy(WED, "10:00", "11:00", "hannah-lee")];
    const slots = times(freeSlots(clinic, service("checkup-cleaning"), WED, events, TEST_NOW));
    expect(slots).toContain("09:00");
    expect(slots).not.toContain("09:30");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("11:00");
  });

  it("lists who is free, in the service's order", () => {
    const events = [busy(WED, "08:00", "09:00", "dr-carter")];
    const [eight, ...rest] = freeSlots(clinic, service("filling"), WED, events, TEST_NOW);
    expect(eight).toMatchObject({ time: "08:00", providerIds: ["dr-okafor"] });
    expect(rest.find((s) => s.time === "09:00")?.providerIds).toEqual(["dr-carter", "dr-okafor"]);
  });

  it("keeps a slot while any provider is free, and drops it when nobody is", () => {
    const events = [
      busy(WED, "08:00", "09:00", "dr-carter"),
      busy(WED, "08:00", "09:00", "dr-okafor"),
    ];
    expect(times(freeSlots(clinic, service("filling"), WED, events, TEST_NOW))[0]).toBe("09:00");
  });

  it("only looks at the requested provider", () => {
    const events = [busy(WED, "08:00", "12:00", "dr-carter")];
    const slots = freeSlots(clinic, service("filling"), WED, events, TEST_NOW, {
      providerId: "dr-carter",
    });
    expect(slots[0]).toMatchObject({ time: "12:00", providerIds: ["dr-carter"] });
  });

  it("returns nothing on a fully booked day", () => {
    const events = [busy(WED, "00:00", "23:59")];
    expect(freeSlots(clinic, service("emergency"), WED, events, TEST_NOW)).toEqual([]);
  });
});

describe("pickSlots and matchesTimeOfDay", () => {
  const slot = (date: string, time: string): Slot => ({
    start: at(date, time),
    end: at(date, time),
    date,
    time,
    providerIds: ["dr-carter"],
  });

  it("spreads the offered times across the day", () => {
    const day = ["08:00", "08:30", "09:00", "10:00", "10:30", "14:00"].map((t) => slot(WED, t));
    expect(times(pickSlots(day, 2))).toEqual(["08:00", "10:00"]);
    expect(times(pickSlots(day, 3))).toEqual(["08:00", "10:00", "14:00"]);
  });

  it("still spreads them as far as it can when the day is packed", () => {
    const day = ["08:00", "08:30", "09:00"].map((t) => slot(WED, t));
    expect(times(pickSlots(day, 2))).toEqual(["08:00", "09:00"]);
    expect(times(pickSlots(day, 5))).toEqual(["08:00", "08:30", "09:00"]);
  });

  it("picks per day", () => {
    const slots = [slot(WED, "08:00"), slot(WED, "15:00"), slot(FRI, "09:00")];
    expect(pickSlots(slots, 1).map((s) => s.date)).toEqual([WED, FRI]);
  });

  it("splits morning and afternoon at noon", () => {
    expect(matchesTimeOfDay({ time: "11:30" }, "morning")).toBe(true);
    expect(matchesTimeOfDay({ time: "12:00" }, "morning")).toBe(false);
    expect(matchesTimeOfDay({ time: "12:00" }, "afternoon")).toBe(true);
    expect(matchesTimeOfDay({ time: "08:00" }, "any")).toBe(true);
  });
});
