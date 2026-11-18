import { describe, expect, it } from "vitest";
import { BookingService } from "../booking/service.ts";
import { TEST_NOW, testClinic } from "../test/helpers.ts";
import { demoCalendar } from "./demo.ts";
import { toLocal } from "./time.ts";

describe("demoCalendar", () => {
  it("is the same on every start", async () => {
    const { clinic } = await testClinic();
    const to = new Date(TEST_NOW.getTime() + 21 * 86_400_000);
    const a = await demoCalendar(clinic, TEST_NOW).listEvents(TEST_NOW, to);
    const b = await demoCalendar(clinic, TEST_NOW).listEvents(TEST_NOW, to);
    expect(a.length).toBeGreaterThan(100);
    expect(a).toEqual(b);
  });

  it("only books providers within opening hours", async () => {
    const { clinic } = await testClinic();
    const events = await demoCalendar(clinic, TEST_NOW).listEvents(
      new Date(0),
      new Date(TEST_NOW.getTime() + 30 * 86_400_000),
    );
    for (const event of events) {
      expect(event.providerId).toBeDefined();
      const start = toLocal(event.start, clinic.timezone);
      const end = toLocal(event.end, clinic.timezone);
      expect(start.date).toBe(end.date);
      expect(start.time >= "08:00" && end.time <= "18:00").toBe(true);
    }
  });

  it("leaves time to book", async () => {
    const { clinic } = await testClinic();
    const booking = new BookingService(clinic, demoCalendar(clinic, TEST_NOW), () => TEST_NOW);
    const { slots } = await booking.availability({ serviceId: "checkup-cleaning" });
    expect(slots.length).toBeGreaterThanOrEqual(4);
  });
});
