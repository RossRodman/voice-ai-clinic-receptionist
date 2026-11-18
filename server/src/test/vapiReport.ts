export function endOfCallReport(
  overrides: Record<string, unknown> = {},
  call: Record<string, unknown> = {
    id: "call_123",
    type: "inboundPhoneCall",
    customer: { number: "+15551234567" },
  },
) {
  const messages = [
    {
      role: "system",
      message: "You are the receptionist at Brightside Dental…",
      time: 0,
      secondsFromStart: 0,
    },
    {
      role: "bot",
      message: "Thanks for calling Brightside Dental, this is Riley. How can I help?",
      secondsFromStart: 0.6,
    },
    {
      role: "user",
      message: "Hi, I'd like to book a cleaning, as soon as you can.",
      secondsFromStart: 5.2,
    },
    {
      role: "tool_calls",
      secondsFromStart: 9.1,
      toolCalls: [
        {
          id: "tc_1",
          type: "function",
          function: { name: "check_availability", arguments: '{"serviceId":"checkup-cleaning"}' },
        },
      ],
    },
    {
      role: "tool_call_result",
      toolCallId: "tc_1",
      name: "check_availability",
      result: "{…}",
      secondsFromStart: 9.4,
    },
    {
      role: "bot",
      message: "I have tomorrow at 9 AM or 11 AM with Hannah. Which works?",
      secondsFromStart: 10.3,
    },
    { role: "user", message: "Nine is good. Maria Lopez.", secondsFromStart: 15.8 },
    {
      role: "tool_calls",
      secondsFromStart: 22.47,
      toolCalls: [
        {
          id: "tc_2",
          type: "function",
          function: {
            name: "book_appointment",
            arguments: {
              serviceId: "checkup-cleaning",
              start: "2026-11-18T09:00:00-06:00",
              patientName: "Maria Lopez",
            },
          },
        },
      ],
    },
    {
      role: "bot",
      message: "You're booked for Wednesday at 9 AM with Hannah Lee.  ",
      secondsFromStart: 24,
    },
    { role: "user", message: "  ", secondsFromStart: 30 },
  ];

  return {
    message: {
      type: "end-of-call-report",
      timestamp: Date.parse("2026-11-17T16:02:00Z"),
      endedReason: "customer-ended-call",
      startedAt: "2026-11-17T16:00:00.000Z",
      endedAt: "2026-11-17T16:01:42.512Z",
      durationSeconds: 102.512,
      cost: 0.1342,
      call,
      analysis: { summary: "Maria Lopez booked a checkup and cleaning for Wednesday at 9 AM." },
      artifact: {
        messages,
        recording: { mono: { combinedUrl: "https://storage.vapi.ai/call_123-mono.wav" } },
        transcript: "AI: Thanks for calling…",
      },
      ...overrides,
    },
  };
}
