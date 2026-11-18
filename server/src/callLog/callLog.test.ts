import { afterEach, describe, expect, it, vi } from "vitest";
import { TEST_SECRET, testApp, toolCallsMessage } from "../test/helpers.ts";
import { endOfCallReport } from "../test/vapiReport.ts";
import { InMemoryCallStore } from "./memory.ts";
import { CallStoreError } from "./types.ts";

/** A whole call through the webhook, the way Vapi sends it, then read back from /api. */

let app: Awaited<ReturnType<typeof testApp>>;
afterEach(() => app.close());

const webhook = (payload: object) =>
  app.inject({
    method: "POST",
    url: "/vapi/webhook",
    headers: { "x-vapi-secret": TEST_SECRET },
    payload,
  });

const CALL = {
  id: "call_123",
  type: "inboundPhoneCall",
  startedAt: "2026-11-17T16:00:00.000Z",
  customer: { number: "+15551234567" },
};

const statusUpdate = (status: string) => ({
  message: { type: "status-update", status, call: CALL },
});

const START = "2026-11-18T09:00:00-06:00";

async function callThatBooks() {
  await webhook(statusUpdate("in-progress"));
  const check = toolCallsMessage([
    { id: "tc_1", name: "check_availability", arguments: { serviceId: "checkup-cleaning" } },
  ]);
  check.message.call = CALL;
  await webhook(check);
  const book = toolCallsMessage([
    {
      id: "tc_2",
      name: "book_appointment",
      arguments: JSON.stringify({
        serviceId: "checkup-cleaning",
        start: START,
        patientName: "Maria Lopez",
        newPatient: true,
      }),
    },
  ]);
  book.message.call = CALL;
  const res = await webhook(book);
  expect(JSON.parse(res.json().results[0].result)).toMatchObject({ booked: true });
}

describe("the call log", () => {
  it("shows the call as live from its first message", async () => {
    app = await testApp();
    await webhook(statusUpdate("in-progress"));
    await app.callLog.idle();

    const { calls, callLog } = (await app.inject("/api/calls")).json();
    expect(callLog).toBe("memory");
    expect(calls).toEqual([
      {
        id: "call_123",
        status: "in-progress",
        type: "inboundPhoneCall",
        customerNumber: "+15551234567",
        startedAt: "2026-11-17T16:00:00.000Z",
        endedAt: null,
        durationSeconds: null,
        endedReason: null,
        outcome: null,
        summary: null,
      },
    ]);
  });

  it("records each tool call and the booking during the call", async () => {
    app = await testApp();
    await callThatBooks();
    await app.callLog.idle();

    const { call } = (await app.inject("/api/calls/call_123")).json();
    expect(call.toolCalls).toEqual([
      expect.objectContaining({
        id: "tc_1",
        name: "check_availability",
        arguments: { serviceId: "checkup-cleaning" },
        result: expect.objectContaining({ service: "Checkup and cleaning" }),
        error: null,
        durationMs: expect.any(Number),
      }),
      expect.objectContaining({
        id: "tc_2",
        name: "book_appointment",
        arguments: expect.objectContaining({ patientName: "Maria Lopez" }),
        result: expect.objectContaining({ booked: true }),
      }),
    ]);
    expect(call.bookings).toEqual([
      {
        id: expect.any(String),
        callId: "call_123",
        serviceId: "checkup-cleaning",
        service: "Checkup and cleaning",
        providerId: "hannah-lee",
        provider: "Hannah Lee",
        startsAt: "2026-11-18T15:00:00.000Z",
        endsAt: "2026-11-18T16:00:00.000Z",
        patientName: "Maria Lopez",
        patientPhone: "+15551234567",
        newPatient: true,
        notes: null,
        createdAt: expect.any(String),
      },
    ]);
  });

  it("saves the end-of-call report with the outcome and when each function ran", async () => {
    app = await testApp();
    await callThatBooks();

    const res = await webhook(endOfCallReport({}, CALL));
    expect(res.statusCode).toBe(200);

    const { call } = (await app.inject("/api/calls/call_123")).json();
    expect(call).toMatchObject({
      status: "ended",
      outcome: "booked",
      durationSeconds: 103,
      summary: "Maria Lopez booked a checkup and cleaning for Wednesday at 9 AM.",
      recordingUrl: "https://storage.vapi.ai/call_123-mono.wav",
      cost: 0.1342,
    });
    expect(call.transcript).toHaveLength(5);
    expect(
      call.toolCalls.map((t: { name: string; secondsFromStart: number }) => [
        t.name,
        t.secondsFromStart,
      ]),
    ).toEqual([
      ["check_availability", 9.1],
      ["book_appointment", 22.47],
    ]);
    // The report doesn't wipe what was recorded during the call.
    expect(call.toolCalls[1].result).toMatchObject({ booked: true });
  });

  it("logs a call it hears of only at the end, Vapi's transfer included", async () => {
    app = await testApp();
    const { message } = endOfCallReport();
    const history = [
      ...message.artifact.messages.slice(0, 3),
      {
        role: "tool_calls",
        secondsFromStart: 7,
        toolCalls: [{ id: "tc_t", function: { name: "transferCall", arguments: "{}" } }],
      },
    ];
    await webhook(
      endOfCallReport(
        { endedReason: "assistant-forwarded-call", artifact: { messages: history } },
        { id: "call_9" },
      ),
    );

    const { call } = (await app.inject("/api/calls/call_9")).json();
    expect(call).toMatchObject({ outcome: "transferred", startedAt: "2026-11-17T16:00:00.000Z" });
    expect(call.toolCalls).toEqual([
      expect.objectContaining({ name: "transferCall", secondsFromStart: 7, result: null }),
    ]);
  });

  it("answers the caller even when the call log is down", async () => {
    const callStore = new InMemoryCallStore();
    const down = () => Promise.reject(new CallStoreError("Supabase is unreachable: fetch failed"));
    vi.spyOn(callStore, "openCall").mockImplementation(down);
    vi.spyOn(callStore, "saveToolCalls").mockImplementation(down);
    app = await testApp({ callStore });

    const message = toolCallsMessage([
      { name: "search_knowledge_base", arguments: { query: "parking" } },
    ]);
    const res = await webhook(message);
    expect(res.json().results[0].result).toMatch(/"found":true/);
    await app.callLog.idle();
  });

  it("tells Vapi when the report couldn't be saved, and /api says why", async () => {
    const callStore = new InMemoryCallStore();
    const down = () => Promise.reject(new CallStoreError("Supabase 503: Service Unavailable", 503));
    vi.spyOn(callStore, "getCall").mockImplementation(down);
    vi.spyOn(callStore, "listCalls").mockImplementation(down);
    app = await testApp({ callStore });

    expect((await webhook(endOfCallReport())).statusCode).toBe(500);

    const res = await app.inject("/api/calls");
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("The call log is unavailable. Supabase 503: Service Unavailable");
  });

  it("rejects a report without a call", async () => {
    app = await testApp();
    const res = await webhook({ message: { type: "end-of-call-report", endedReason: "x" } });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/calls", () => {
  it("lists the latest calls first, up to the limit", async () => {
    app = await testApp();
    for (const [id, startedAt] of [
      ["a", "2026-11-17T09:00:00Z"],
      ["b", "2026-11-17T11:00:00Z"],
      ["c", "2026-11-17T10:00:00Z"],
    ]) {
      await app.callStore.openCall({ id: id!, startedAt: new Date(startedAt!).toISOString() });
    }
    const { calls } = (await app.inject("/api/calls?limit=2")).json();
    expect(calls.map((c: { id: string }) => c.id)).toEqual(["b", "c"]);

    expect((await app.inject("/api/calls?limit=0")).statusCode).toBe(400);
  });

  it("says when a call isn't there", async () => {
    app = await testApp();
    const res = await app.inject("/api/calls/nope");
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "There is no call with this id." });
  });
});
