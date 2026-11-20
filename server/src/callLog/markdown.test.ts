import { describe, expect, it } from "vitest";
import { callMarkdown, clock, maskPhone } from "./markdown.ts";
import type { CallDetail } from "./types.ts";

const CALL: CallDetail = {
  id: "call_1",
  status: "ended",
  type: "webCall",
  customerNumber: null,
  startedAt: "2026-11-19T21:00:00.000Z",
  endedAt: "2026-11-19T21:02:41.000Z",
  durationSeconds: 161,
  endedReason: "customer-ended-call",
  outcome: "booked",
  summary: "Maria booked a cleaning.",
  transcript: [
    { role: "assistant", text: "Thanks for calling Brightside Dental.", secondsFromStart: 0.5 },
    { role: "caller", text: "I'd like a cleaning.", secondsFromStart: 4 },
    { role: "assistant", text: "I have Friday at 9 AM.", secondsFromStart: 12 },
  ],
  recordingUrl: "https://storage.vapi.ai/call_1-mono.wav",
  cost: 0.2134,
  toolCalls: [
    {
      id: "tc_1",
      callId: "call_1",
      name: "check_availability",
      arguments: { serviceId: "checkup-cleaning" },
      result: '{"slots":[]}',
      error: null,
      durationMs: 41,
      secondsFromStart: 8.2,
      createdAt: "2026-11-19T21:00:08.200Z",
    },
  ],
  bookings: [
    {
      id: "evt_1",
      callId: "call_1",
      serviceId: "checkup-cleaning",
      service: "Checkup and cleaning",
      providerId: "hannah-lee",
      provider: "Hannah Lee",
      startsAt: "2026-11-20T15:00:00.000Z",
      endsAt: "2026-11-20T16:00:00.000Z",
      patientName: "Maria Lopez",
      patientPhone: "+1 (555) 123-4567",
      newPatient: true,
      notes: null,
      createdAt: "2026-11-19T21:00:20.000Z",
    },
  ],
};

describe("callMarkdown", () => {
  const md = callMarkdown(CALL, "America/Chicago");

  it("lists the call's details in the clinic's time zone", () => {
    expect(md).toContain("| Caller | Web call |");
    expect(md).toContain("| Started | Thursday, November 19, 2026 at 3:00 PM CST |");
    expect(md).toContain("| Length | 2:41 |");
    expect(md).toContain("| Outcome | Booked an appointment |");
    expect(md).toContain("| Cost | $0.21 |");
  });

  it("puts the functions in the conversation where they ran", () => {
    const order = [
      "Thanks for calling",
      "I'd like a cleaning",
      "Checked free times",
      "Friday at 9",
    ];
    const positions = order.map((text) => md.indexOf(text));

    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
    expect(md).toContain(
      "<code>0:08</code> ⚙️ Checked free times · <code>check_availability</code>, 41 ms",
    );
    expect(md).toContain('"slots": []');
  });

  it("shows the booking without the patient's full number", () => {
    expect(md).toContain(
      "**Checkup and cleaning** with Hannah Lee, Friday, November 20, 2026 at 9:00 AM CST",
    );
    expect(md).toContain("Maria Lopez, •••-•••-4567, new patient");
    expect(md).not.toContain("123-4567");
  });

  it("links the downloaded recording instead of Vapi's", () => {
    expect(md).toContain("(https://storage.vapi.ai/call_1-mono.wav)");
    expect(callMarkdown(CALL, "America/Chicago", { recording: "recording.wav" })).toContain(
      "[Listen to the call](recording.wav)",
    );
  });
});

describe("helpers", () => {
  it("formats times and masks numbers", () => {
    expect(clock(161.7)).toBe("2:41");
    expect(maskPhone("+15551234567")).toBe("•••-•••-4567");
    expect(maskPhone("911")).toBe("911");
  });
});
