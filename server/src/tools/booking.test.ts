import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TEST_SECRET, testApp, testClinic, toolCallsMessage } from "../test/helpers.ts";
import { toolDefinitions } from "./index.ts";
import { normalizePhone } from "./bookAppointment.ts";

/**
 * check_availability and book_appointment the way Vapi calls them: a signed webhook
 * request, the result read back as the model gets it.
 */

let app: Awaited<ReturnType<typeof testApp>>;

beforeEach(async () => {
  app = await testApp();
});
afterEach(() => app.close());

async function callTool(
  name: string,
  args: Record<string, unknown>,
  call: Record<string, unknown> = { id: "call_123", customer: { number: "+15551234567" } },
) {
  const body = toolCallsMessage([{ name, arguments: args }]);
  body.message.call = call as typeof body.message.call;
  const res = await app.inject({
    method: "POST",
    url: "/vapi/webhook",
    headers: { "x-vapi-secret": TEST_SECRET },
    payload: body,
  });
  expect(res.statusCode).toBe(200);
  const [result] = res.json().results;
  return result.error === undefined
    ? { value: JSON.parse(result.result), error: undefined }
    : { value: undefined, error: result.error as string };
}

describe("check_availability", () => {
  it("returns times to offer, with what book_appointment needs", async () => {
    const { value } = await callTool("check_availability", {
      serviceId: "kids-checkup",
      date: "2026-11-19",
    });
    expect(value).toMatchObject({
      today: "Tuesday, November 17",
      service: "Children's checkup and cleaning",
      durationMinutes: 45,
      requestedDate: "2026-11-19",
      requestedDateAvailable: true,
    });
    expect(value.slots[0]).toEqual({
      start: "2026-11-19T08:00:00-06:00",
      spoken: "Thursday, November 19 at 8 AM",
      provider: "Dr. Sofia Ramirez",
      providerId: "dr-ramirez",
    });
    expect(value.instruction).toMatch(/^Offer two or three of these times/);
  });

  it("puts the reason first when the day doesn't work", async () => {
    const { value } = await callTool("check_availability", {
      serviceId: "whitening",
      date: "2026-11-22",
    });
    expect(value.instruction).toMatch(
      /^Tell the caller: The clinic is closed on Sundays. Offer two/,
    );
  });

  it("returns an error the model can fix", async () => {
    expect((await callTool("check_availability", {})).error).toMatch(/serviceId/);
    expect((await callTool("check_availability", { serviceId: "cleaning" })).error).toMatch(
      /Unknown service "cleaning". Use one of/,
    );
    expect(
      (await callTool("check_availability", { serviceId: "filling", date: "next tuesday" })).error,
    ).toMatch(/date must be YYYY-MM-DD/);
  });
});

describe("book_appointment", () => {
  it("books a slot check_availability offered, with the caller's number", async () => {
    const { value: offer } = await callTool("check_availability", { serviceId: "filling" });
    const slot = offer.slots[1];

    const { value } = await callTool("book_appointment", {
      serviceId: "filling",
      start: slot.start,
      providerId: slot.providerId,
      patientName: "Maria Lopez",
      newPatient: true,
      notes: "Lost a filling, lower left",
    });

    expect(value).toEqual({
      booked: true,
      appointmentId: expect.any(String),
      service: "Tooth-colored filling",
      when: slot.spoken,
      durationMinutes: 60,
      provider: slot.provider,
      patientName: "Maria Lopez",
      patientPhone: "+15551234567",
      instruction: expect.stringMatching(/^The appointment is booked/),
    });

    const [event] = await app.calendar.listEvents(
      new Date(slot.start),
      new Date(Date.parse(slot.start) + 1),
    );
    expect(event?.appointment).toMatchObject({
      callId: "call_123",
      newPatient: true,
      notes: "Lost a filling, lower left",
    });

    const appointments = (await app.inject({ method: "GET", url: "/api/appointments" })).json();
    expect(appointments.appointments).toHaveLength(1);
  });

  it("offers other times when the slot was taken in between", async () => {
    const start = "2026-11-18T09:00:00-06:00";
    const args = { serviceId: "checkup-cleaning", start, patientName: "Maria Lopez" };
    expect((await callTool("book_appointment", args)).value.booked).toBe(true);

    const { value } = await callTool("book_appointment", {
      ...args,
      patientName: "Tom Reed",
      patientPhone: "(555) 000-1111",
    });
    expect(value).toMatchObject({
      booked: false,
      reason: "Wednesday, November 18 at 9 AM was just taken.",
    });
    expect(value.alternatives.length).toBeGreaterThan(0);
    expect(value.instruction).toMatch(/offer two or three of the alternatives/);
  });

  it("needs a phone number when the caller's is hidden", async () => {
    const { error } = await callTool(
      "book_appointment",
      { serviceId: "emergency", start: "2026-11-18T09:00:00-06:00", patientName: "Ann Lee" },
      { id: "call_web" },
    );
    expect(error).toMatch(/ask the caller for one/);
  });

  it("rejects an incomplete phone number and a missing name", async () => {
    const start = "2026-11-18T09:00:00-06:00";
    expect(
      (
        await callTool("book_appointment", {
          serviceId: "emergency",
          start,
          patientName: "Ann Lee",
          patientPhone: "555",
        })
      ).error,
    ).toMatch(/not a full phone number/);
    expect((await callTool("book_appointment", { serviceId: "emergency", start })).error).toMatch(
      /patientName/,
    );
    expect(await app.calendar.listEvents(new Date("2026-11-01"), new Date("2027-02-01"))).toEqual(
      [],
    );
  });
});

describe("normalizePhone", () => {
  it.each([
    ["+1 (555) 123-4567", "+15551234567"],
    ["555-123-4567", "5551234567"],
    ["555 12", null],
    ["+1234567890123456", null],
  ])("%s → %s", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });
});

describe("toolDefinitions", () => {
  it("lists the clinic's services and providers as enums", async () => {
    const { clinic } = await testClinic();
    const [search, check, book] = toolDefinitions(clinic);
    expect([search.function.name, check.function.name, book.function.name]).toEqual([
      "search_knowledge_base",
      "check_availability",
      "book_appointment",
    ]);
    expect(check.function.parameters.properties.serviceId.enum).toContain("root-canal");
    expect(book.function.parameters.properties.providerId.enum).toEqual([
      "dr-carter",
      "dr-okafor",
      "dr-ramirez",
      "hannah-lee",
    ]);
  });
});
