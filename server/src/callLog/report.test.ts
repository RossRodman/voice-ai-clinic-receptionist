import { describe, expect, it } from "vitest";
import { endOfCallReport } from "../test/vapiReport.ts";
import { endOfCallReportSchema } from "../vapi/schemas.ts";
import { callOutcome, parseReport, type OutcomeFacts } from "./report.ts";

const received = new Date("2026-11-17T16:02:00Z");
const parse = (overrides: Record<string, unknown> = {}, call?: Record<string, unknown>) =>
  parseReport(endOfCallReportSchema.parse(endOfCallReport(overrides, call).message), received);

describe("parseReport", () => {
  it("reads the call, the transcript and where each function was called", () => {
    const { call, toolCalls } = parse();

    expect(call).toEqual({
      id: "call_123",
      status: "ended",
      type: "inboundPhoneCall",
      customerNumber: "+15551234567",
      startedAt: "2026-11-17T16:00:00.000Z",
      endedAt: "2026-11-17T16:01:42.512Z",
      durationSeconds: 103,
      endedReason: "customer-ended-call",
      summary: "Maria Lopez booked a checkup and cleaning for Wednesday at 9 AM.",
      transcript: [
        {
          role: "assistant",
          text: "Thanks for calling Brightside Dental, this is Riley. How can I help?",
          secondsFromStart: 0.6,
        },
        {
          role: "caller",
          text: "Hi, I'd like to book a cleaning, as soon as you can.",
          secondsFromStart: 5.2,
        },
        {
          role: "assistant",
          text: "I have tomorrow at 9 AM or 11 AM with Hannah. Which works?",
          secondsFromStart: 10.3,
        },
        { role: "caller", text: "Nine is good. Maria Lopez.", secondsFromStart: 15.8 },
        {
          role: "assistant",
          text: "You're booked for Wednesday at 9 AM with Hannah Lee.",
          secondsFromStart: 24,
        },
      ],
      recordingUrl: "https://storage.vapi.ai/call_123-mono.wav",
      cost: 0.1342,
    });

    expect(toolCalls).toEqual([
      {
        id: "tc_1",
        callId: "call_123",
        name: "check_availability",
        arguments: { serviceId: "checkup-cleaning" },
        secondsFromStart: 9.1,
      },
      {
        id: "tc_2",
        callId: "call_123",
        name: "book_appointment",
        arguments: {
          serviceId: "checkup-cleaning",
          start: "2026-11-18T09:00:00-06:00",
          patientName: "Maria Lopez",
        },
        secondsFromStart: 22.47,
      },
    ]);
  });

  it("reads the older format, with everything at the top level", () => {
    const { message } = endOfCallReport();
    const { call } = parse({
      artifact: undefined,
      analysis: undefined,
      startedAt: undefined,
      endedAt: undefined,
      durationSeconds: undefined,
      durationMs: 61_000,
      summary: "A short call.",
      recordingUrl: "https://storage.vapi.ai/old.wav",
      messages: message.artifact.messages,
    });

    expect(call).toMatchObject({
      summary: "A short call.",
      recordingUrl: "https://storage.vapi.ai/old.wav",
      endedAt: "2026-11-17T16:02:00.000Z",
      startedAt: "2026-11-17T16:00:59.000Z",
      durationSeconds: 61,
    });
    expect(call.transcript).toHaveLength(5);
  });

  it("works out the length from the times, and copes with almost nothing", () => {
    expect(parse({ durationSeconds: undefined }).call.durationSeconds).toBe(103);

    const { call, toolCalls } = parse(
      {
        artifact: null,
        analysis: null,
        startedAt: null,
        endedAt: null,
        durationSeconds: null,
        cost: null,
        endedReason: null,
      },
      { id: "call_web" },
    );
    expect(call).toEqual({
      id: "call_web",
      status: "ended",
      endedAt: "2026-11-17T16:02:00.000Z",
      endedReason: null,
      summary: null,
      transcript: [],
      recordingUrl: null,
      cost: null,
    });
    expect(toolCalls).toEqual([]);
  });

  it("keeps arguments that aren't valid JSON as they came", () => {
    const { message } = endOfCallReport();
    const history = structuredClone(message.artifact.messages);
    history[3]!.toolCalls![0]!.function.arguments = "{oops";
    const { toolCalls } = parse({ artifact: { messages: history } });
    expect(toolCalls[0]!.arguments).toEqual({ raw: "{oops" });
  });
});

describe("callOutcome", () => {
  const talked = [{ role: "caller" as const, text: "Hi", secondsFromStart: 2 }];
  const facts = {
    endedReason: "customer-ended-call",
    booked: false,
    transcript: talked,
    toolNames: [] as string[],
  };

  it.each([
    ["booked", { booked: true, endedReason: "assistant-forwarded-call" }],
    ["transferred", { endedReason: "assistant-forwarded-call" }],
    ["transferred", { toolNames: ["search_knowledge_base", "transferCall"] }],
    ["failed", { endedReason: "pipeline-error-openai-llm-failed" }],
    ["failed", { endedReason: "call.in-progress.error-vapifault-transport-never-connected" }],
    ["hung-up", { transcript: [], endedReason: "silence-timed-out" }],
    [
      "hung-up",
      { transcript: [{ role: "assistant" as const, text: "Hello?", secondsFromStart: 1 }] },
    ],
    ["answered", { toolNames: ["search_knowledge_base"] }],
    ["answered", { endedReason: null }],
  ] as const)("%s: %o", (expected, override) => {
    expect(callOutcome({ ...facts, ...override } as OutcomeFacts)).toBe(expected);
  });
});
