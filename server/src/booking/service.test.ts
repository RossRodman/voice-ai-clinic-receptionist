import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { InMemoryCalendar } from "../calendar/memory.ts";
import { fromLocal } from "../calendar/time.ts";
import type { CalendarEvent } from "../calendar/types.ts";
import type { Clinic } from "../clinic/schema.ts";
import { TEST_NOW, testClinic } from "../test/helpers.ts";
import { BookingError, BookingService, type BookingRequest } from "./service.ts";

let clinic: Clinic;
let calendar: InMemoryCalendar;
let booking: BookingService;

beforeAll(async () => {
  clinic = (await testClinic()).clinic;
});

beforeEach(() => {
  calendar = new InMemoryCalendar();
  booking = new BookingService(clinic, calendar, () => TEST_NOW);
});

const at = (date: string, time: string) => fromLocal(date, time, clinic.timezone);
const block = (date: string, from: string, to: string, providerId?: string) =>
  calendar.add({
    summary: "Busy",
    start: at(date, from),
    end: at(date, to),
    ...(providerId ? { providerId } : {}),
  });

// TEST_NOW is Tuesday, November 17, 2026, 10:00 AM in Chicago (UTC-6).
const TUE = "2026-11-17";
const WED = "2026-11-18";
const THU = "2026-11-19";
const SUN = "2026-11-22";

const request = (overrides: Partial<BookingRequest> = {}): BookingRequest => ({
  serviceId: "checkup-cleaning",
  start: "2026-11-18T09:00:00-06:00",
  patientName: "Maria Lopez",
  patientPhone: "+15551234567",
  ...overrides,
});

describe("availability", () => {
  it("offers the soonest days, two spread-out times a day, starting today", async () => {
    const result = await booking.availability({ serviceId: "checkup-cleaning" });
    expect(result.today).toBe("Tuesday, November 17");
    expect(result.service).toEqual({
      id: "checkup-cleaning",
      name: "Checkup and cleaning",
      durationMinutes: 60,
    });
    expect(result.note).toBeUndefined();
    expect(result.slots.map((s) => s.spoken)).toEqual([
      "Tuesday, November 17 at noon",
      "Tuesday, November 17 at 2 PM",
      "Wednesday, November 18 at 8 AM",
      "Wednesday, November 18 at 10 AM",
      "Thursday, November 19 at 8 AM",
      "Thursday, November 19 at 10 AM",
    ]);
    expect(result.slots[0]).toEqual({
      start: "2026-11-17T12:00:00-06:00",
      date: TUE,
      time: "12:00",
      spoken: "Tuesday, November 17 at noon",
      providerId: "hannah-lee",
      provider: "Hannah Lee",
    });
  });

  it("works around existing appointments", async () => {
    block(WED, "08:00", "11:00", "hannah-lee");
    const { slots } = await booking.availability({ serviceId: "checkup-cleaning", date: WED });
    expect(slots[0]?.time).toBe("11:00");
  });

  it("offers more times on the day the caller asked for", async () => {
    const result = await booking.availability({ serviceId: "checkup-cleaning", date: THU });
    expect(result).toMatchObject({ requestedDate: THU, requestedDateAvailable: true });
    expect(result.slots.map((s) => s.time)).toEqual(["08:00", "10:00", "12:00", "14:00"]);
  });

  it("filters by time of day", async () => {
    const { slots } = await booking.availability({
      serviceId: "checkup-cleaning",
      date: THU,
      timeOfDay: "afternoon",
    });
    expect(slots.map((s) => s.time)).toEqual(["12:00", "13:00", "14:00", "16:00"]);
  });

  it("says the clinic is closed on Sundays and offers the next days", async () => {
    const result = await booking.availability({ serviceId: "emergency", date: SUN });
    expect(result).toMatchObject({
      requestedDateAvailable: false,
      note: "The clinic is closed on Sundays.",
    });
    expect(result.slots[0]?.date).toBe("2026-11-23");
    expect(new Set(result.slots.map((s) => s.date)).size).toBe(3);
  });

  it("says when the day is fully booked", async () => {
    block(THU, "00:00", "23:59");
    const result = await booking.availability({
      serviceId: "filling",
      date: THU,
      providerId: "dr-carter",
    });
    expect(result.note).toBe("Thursday, November 19 is fully booked with Dr. Emily Carter.");
    expect(result.slots[0]).toMatchObject({ date: "2026-11-20", providerId: "dr-carter" });
  });

  it("says when nothing is left today", async () => {
    block(TUE, "11:00", "18:00", "hannah-lee");
    const result = await booking.availability({ serviceId: "checkup-cleaning", date: TUE });
    expect(result.note).toBe("There is nothing left today.");
    expect(result.slots[0]?.date).toBe(WED);
  });

  it("only offers the dentist the caller asked for", async () => {
    block(WED, "08:00", "18:00", "dr-carter");
    const { slots } = await booking.availability({
      serviceId: "filling",
      date: WED,
      providerId: "dr-okafor",
    });
    expect(slots.every((s) => s.providerId === "dr-okafor")).toBe(true);
    expect(slots[0]?.time).toBe("08:00");
  });

  it("refuses dates in the past and says what today is", async () => {
    await expect(
      booking.availability({ serviceId: "emergency", date: "2026-11-10" }),
    ).rejects.toThrow("Tuesday, November 10 has passed. Today is Tuesday, November 17");
  });

  it("explains the booking window", async () => {
    const result = await booking.availability({ serviceId: "emergency", date: "2027-03-01" });
    expect(result).toMatchObject({ requestedDateAvailable: false, slots: [] });
    expect(result.note).toBe(
      "Appointments can be booked up to 60 days ahead, until Saturday, January 16.",
    );
  });

  it("says when there is nothing free at all", async () => {
    calendar.add({ summary: "Closed", start: at(TUE, "00:00"), end: at("2027-02-01", "00:00") });
    const result = await booking.availability({ serviceId: "crown" });
    expect(result.slots).toEqual([]);
    expect(result.note).toBe("No free times for crown in the next 60 days.");
  });

  it("rejects an unknown service, a wrong dentist and a bad date", async () => {
    await expect(booking.availability({ serviceId: "botox" })).rejects.toThrow(
      /Unknown service "botox". Use one of: new-patient-exam, checkup-cleaning/,
    );
    await expect(
      booking.availability({ serviceId: "root-canal", providerId: "dr-ramirez" }),
    ).rejects.toThrow(
      "Dr. Sofia Ramirez doesn't do root canal. It is done by Dr. James Okafor (dr-okafor).",
    );
    await expect(
      booking.availability({ serviceId: "root-canal", date: "2026-02-30" }),
    ).rejects.toThrow(BookingError);
  });

  it("uses the right offset after the clocks change", async () => {
    const march = new BookingService(clinic, calendar, () => new Date("2027-03-12T16:00:00Z"));
    const { slots } = await march.availability({
      serviceId: "checkup-cleaning",
      date: "2027-03-15",
    });
    expect(slots[0]?.start).toBe("2027-03-15T08:00:00-05:00");
  });
});

describe("book", () => {
  it("books the slot and stores the patient's details on the event", async () => {
    const result = await booking.book(
      request({ newPatient: false, notes: "Sensitive teeth", callId: "call_1" }),
    );
    expect(result).toMatchObject({
      status: "booked",
      alreadyBooked: false,
      appointment: {
        service: "Checkup and cleaning",
        provider: "Hannah Lee",
        start: "2026-11-18T09:00:00-06:00",
        end: "2026-11-18T10:00:00-06:00",
        spoken: "Wednesday, November 18 at 9 AM",
        durationMinutes: 60,
        patientName: "Maria Lopez",
      },
    });

    const [event] = await calendar.listEvents(at(WED, "00:00"), at(THU, "00:00"));
    expect(event).toMatchObject({
      summary: "Checkup and cleaning: Maria Lopez",
      providerId: "hannah-lee",
      appointment: {
        serviceId: "checkup-cleaning",
        providerId: "hannah-lee",
        patientPhone: "+15551234567",
        newPatient: false,
        notes: "Sensitive teeth",
        callId: "call_1",
      },
    });
  });

  it("takes a local time without an offset", async () => {
    const result = await booking.book(request({ start: "2026-11-18T09:00" }));
    expect(result.status === "booked" && result.appointment.start).toBe(
      "2026-11-18T09:00:00-06:00",
    );
  });

  it("gives the slot to the next free dentist", async () => {
    block(WED, "09:00", "10:00", "dr-carter");
    const result = await booking.book(request({ serviceId: "filling" }));
    expect(result.status === "booked" && result.appointment.providerId).toBe("dr-okafor");
  });

  it("doesn't double-book: the second caller gets other times", async () => {
    await booking.book(request());
    const second = await booking.book(
      request({ patientName: "Tom Reed", patientPhone: "+15550000000" }),
    );
    expect(second).toMatchObject({
      status: "unavailable",
      reason: "Wednesday, November 18 at 9 AM was just taken.",
    });
    if (second.status !== "unavailable") {
      throw new Error("expected unavailable");
    }
    expect(second.alternatives.length).toBeGreaterThan(0);
    expect(second.alternatives.map((s) => s.start)).not.toContain("2026-11-18T09:00:00-06:00");
    expect(calendar.size).toBe(1);
  });

  it("doesn't double-book when two calls book the same time at once", async () => {
    const results = await Promise.all([
      booking.book(request({ patientName: "Ann One", patientPhone: "+15550000001" })),
      booking.book(request({ patientName: "Bob Two", patientPhone: "+15550000002" })),
      booking.book(request({ patientName: "Cy Three", patientPhone: "+15550000003" })),
    ]);
    expect(results.map((r) => r.status).toSorted()).toEqual([
      "booked",
      "unavailable",
      "unavailable",
    ]);
    expect(calendar.size).toBe(1);
  });

  it("books one appointment when the same request comes twice", async () => {
    const first = await booking.book(request());
    const again = await booking.book(request());
    expect(again).toMatchObject({ status: "booked", alreadyBooked: true });
    expect(first.status === "booked" && again.status === "booked" && again.appointment.id).toBe(
      first.status === "booked" && first.appointment.id,
    );
    expect(calendar.size).toBe(1);
  });

  it("refuses the requested dentist when they are busy, even if someone else is free", async () => {
    block(WED, "09:00", "10:00", "dr-carter");
    const result = await booking.book(request({ serviceId: "filling", providerId: "dr-carter" }));
    expect(result).toMatchObject({
      status: "unavailable",
      reason: "Wednesday, November 18 at 9 AM with Dr. Emily Carter was just taken.",
    });
  });

  it.each([
    ["2026-11-17T08:00:00-06:00", "Tuesday, November 17 at 8 AM has passed."],
    [
      "2026-11-17T11:00:00-06:00",
      "Tuesday, November 17 at 11 AM is too soon: appointments need 2 hours notice.",
    ],
    ["2026-11-22T10:00:00-06:00", "The clinic is closed on Sundays."],
    [
      "2026-11-18T09:15:00-06:00",
      "Wednesday, November 18 at 9:15 AM is not an appointment time for checkup and cleaning (60 minutes) within opening hours.",
    ],
    [
      "2026-11-18T17:30:00-06:00",
      "Wednesday, November 18 at 5:30 PM is not an appointment time for checkup and cleaning (60 minutes) within opening hours.",
    ],
    ["2027-02-01T09:00:00-06:00", "Appointments can be booked up to 60 days ahead."],
  ])("refuses %s: %s", async (start, reason) => {
    const result = await booking.book(request({ start }));
    expect(result).toMatchObject({ status: "unavailable", reason });
    expect(calendar.size).toBe(0);
  });

  it("rejects a start that isn't a time", async () => {
    await expect(booking.book(request({ start: "tomorrow at 9" }))).rejects.toThrow(
      /not a start time/,
    );
  });

  it("is checked against the calendar at booking time, not when the slots were offered", async () => {
    const { slots } = await booking.availability({ serviceId: "checkup-cleaning", date: WED });
    block(WED, "08:00", "09:00", "hannah-lee"); // someone books it by phone meanwhile
    const result = await booking.book(request({ start: slots[0]!.start }));
    expect(result.status).toBe("unavailable");
  });
});

describe("upcoming and schedule", () => {
  it("lists only the appointments the assistant booked", async () => {
    block(WED, "12:00", "13:00", "dr-carter");
    await booking.book(request());
    const appointments = await booking.upcoming();
    expect(appointments).toHaveLength(1);
    expect(appointments[0]).toMatchObject({ patientName: "Maria Lopez", provider: "Hannah Lee" });
  });

  it("returns every free slot day by day, with closed days marked", async () => {
    block(WED, "08:00", "17:00", "hannah-lee");
    const { today, days } = await booking.schedule("checkup-cleaning", TUE, 6);
    expect(today).toBe(TUE);
    expect(days.map((d) => [d.date, d.closed, d.slots.length])).toEqual([
      [TUE, false, 11],
      [WED, false, 1],
      [THU, false, 19],
      ["2026-11-20", false, 13],
      ["2026-11-21", false, 7],
      [SUN, true, 0],
    ]);
    expect(days[1]?.slots[0]).toEqual({
      start: "2026-11-18T17:00:00-06:00",
      time: "17:00",
      label: "5 PM",
      providerIds: ["hannah-lee"],
    });
  });

  it("returns appointments as events, so Front Desk can tell them apart", () => {
    const event: CalendarEvent = {
      id: "x",
      summary: "Lunch",
      start: at(WED, "12:00"),
      end: at(WED, "13:00"),
    };
    expect(booking.toAppointment(event)).toBeUndefined();
  });
});
