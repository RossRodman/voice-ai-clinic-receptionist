import type {
  Appointment,
  AssistantOverview,
  CallDetail,
  CallStats,
  CallSummary,
  AvailabilityToolResult,
  Clinic,
  KnowledgeEntry,
  ScheduleResponse,
  SearchResponse,
} from "@/types";

export const CLINIC: Clinic = {
  name: "Brightside Dental",
  phone: "+1 (555) 014-2300",
  email: "hello@brightside-dental.example",
  address: "214 Maple Avenue, Suite 3, Springfield, IL 62704",
  website: "brightside-dental.example",
  timezone: "America/Chicago",
  hours: [
    { days: "Monday to Thursday", hours: "8 AM to 6 PM" },
    { days: "Sunday", hours: "closed" },
  ],
  providers: [
    { id: "dr-okafor", name: "Dr. James Okafor", title: "DMD", role: "General dentist", bio: "" },
    { id: "hannah-lee", name: "Hannah Lee", title: "RDH", role: "Dental hygienist", bio: "" },
  ],
  services: [
    {
      id: "checkup-cleaning",
      name: "Checkup and cleaning",
      description: "A routine cleaning.",
      durationMinutes: 60,
      price: "$120",
      providers: ["hannah-lee"],
    },
    {
      id: "root-canal",
      name: "Root canal",
      description: "Saves the tooth.",
      durationMinutes: 90,
      price: "from $950",
      providers: ["dr-okafor"],
    },
  ],
  insurance: {
    inNetwork: ["Delta Dental PPO", "MetLife"],
    notAccepted: ["Medicaid"],
    notes: "",
  },
  languages: ["English", "Spanish"],
  booking: { slotMinutes: 30, minNoticeMinutes: 120, maxDaysAhead: 60 },
  calendar: "demo",
  callLog: "memory",
};

const CLEANING: KnowledgeEntry = {
  id: "service:checkup-cleaning",
  title: "Checkup and cleaning",
  content: "Checkup and cleaning: a routine cleaning. It takes about 60 minutes and costs $120.",
  keywords: [],
  source: "clinic",
  serviceId: "checkup-cleaning",
};

export const ENTRIES: KnowledgeEntry[] = [
  CLEANING,
  {
    id: "faq:parking-and-getting-here",
    title: "Parking and getting here",
    content: "Free parking in the lot behind the building.",
    keywords: ["park", "car"],
    source: "faq",
  },
];

export const FOUND: SearchResponse = {
  query: "How much is a cleaning?",
  found: true,
  terms: ["price", "cleaning"],
  coverage: 1,
  hits: [{ ...CLEANING, score: 3.9 }],
  toolResult: {
    found: true,
    answers: [{ topic: CLEANING.title, answer: CLEANING.content, serviceId: "checkup-cleaning" }],
  },
};

export const NOT_FOUND: SearchResponse = {
  query: "Do you offer botox?",
  found: false,
  terms: ["offer", "botox"],
  coverage: 0.35,
  hits: [],
  toolResult: { found: false, instruction: "This is not in the clinic's knowledge base." },
};

const slot = (date: string, time: string, label: string, providerIds = ["hannah-lee"]) => ({
  start: `${date}T${time}:00-06:00`,
  time,
  label,
  providerIds,
});

export const SCHEDULE: ScheduleResponse = {
  calendar: "demo",
  today: "2026-11-17",
  days: [
    {
      date: "2026-11-17",
      label: "Tuesday, November 17",
      closed: false,
      slots: [slot("2026-11-17", "12:00", "noon"), slot("2026-11-17", "14:00", "2 PM")],
    },
    { date: "2026-11-18", label: "Wednesday, November 18", closed: false, slots: [] },
    {
      date: "2026-11-19",
      label: "Thursday, November 19",
      closed: false,
      slots: [slot("2026-11-19", "08:00", "8 AM"), slot("2026-11-19", "09:30", "9:30 AM")],
    },
    { date: "2026-11-20", label: "Friday, November 20", closed: false, slots: [] },
    { date: "2026-11-21", label: "Saturday, November 21", closed: false, slots: [] },
    { date: "2026-11-22", label: "Sunday, November 22", closed: true, slots: [] },
    { date: "2026-11-23", label: "Monday, November 23", closed: false, slots: [] },
  ],
};

export const AVAILABILITY: AvailabilityToolResult = {
  today: "Tuesday, November 17",
  service: "Checkup and cleaning",
  durationMinutes: 60,
  slots: [
    {
      start: "2026-11-17T12:00:00-06:00",
      spoken: "Tuesday, November 17 at noon",
      provider: "Hannah Lee",
      providerId: "hannah-lee",
    },
    {
      start: "2026-11-19T08:00:00-06:00",
      spoken: "Thursday, November 19 at 8 AM",
      provider: "Hannah Lee",
      providerId: "hannah-lee",
    },
  ],
  instruction: "Offer two or three of these times, saying the day and the time.",
};

export const CLOSED_SUNDAY: AvailabilityToolResult = {
  ...AVAILABILITY,
  requestedDate: "2026-11-22",
  requestedDateAvailable: false,
  note: "The clinic is closed on Sundays.",
  slots: [
    {
      start: "2026-11-23T08:00:00-06:00",
      spoken: "Monday, November 23 at 8 AM",
      provider: "Hannah Lee",
      providerId: "hannah-lee",
    },
  ],
};

export const APPOINTMENT: Appointment = {
  id: "evt_1",
  serviceId: "checkup-cleaning",
  service: "Checkup and cleaning",
  providerId: "hannah-lee",
  provider: "Hannah Lee",
  start: "2026-11-19T08:00:00-06:00",
  end: "2026-11-19T09:00:00-06:00",
  spoken: "Thursday, November 19 at 8 AM",
  durationMinutes: 60,
  patientName: "Maria Lopez",
  patientPhone: "+15551234567",
  newPatient: true,
  notes: "Sensitive teeth",
  callId: "call_1",
};

export const CALL_SUMMARY: CallSummary = {
  id: "call_1",
  status: "ended",
  type: "inboundPhoneCall",
  customerNumber: "+15551234567",
  startedAt: "2026-11-17T16:00:00.000Z",
  endedAt: "2026-11-17T16:01:43.000Z",
  durationSeconds: 103,
  endedReason: "customer-ended-call",
  outcome: "booked",
  summary: "Maria Lopez booked a checkup and cleaning for Thursday at 8 AM.",
};

export const LIVE_CALL: CallSummary = {
  ...CALL_SUMMARY,
  id: "call_2",
  status: "in-progress",
  customerNumber: "+15559876543",
  startedAt: "2026-11-17T16:05:00.000Z",
  endedAt: null,
  durationSeconds: null,
  endedReason: null,
  outcome: null,
  summary: null,
};

export const CALL: CallDetail = {
  ...CALL_SUMMARY,
  transcript: [
    { role: "assistant", text: "Thanks for calling Brightside Dental.", secondsFromStart: 0.6 },
    { role: "caller", text: "I'd like a cleaning, please.", secondsFromStart: 4.2 },
    { role: "assistant", text: "I have Thursday at 8 AM.", secondsFromStart: 10.3 },
  ],
  recordingUrl: "https://storage.vapi.ai/call_1-mono.wav",
  cost: 0.1342,
  toolCalls: [
    {
      id: "tc_1",
      callId: "call_1",
      name: "check_availability",
      arguments: { serviceId: "checkup-cleaning" },
      result: { service: "Checkup and cleaning", slots: [] },
      error: null,
      durationMs: 3,
      secondsFromStart: 9.1,
      createdAt: "2026-11-17T16:00:09.000Z",
    },
    {
      id: "tc_2",
      callId: "call_1",
      name: "book_appointment",
      arguments: { serviceId: "checkup-cleaning", start: "2026-11-19T08:00:00-06:00" },
      result: null,
      error: "No phone number: ask the caller for one and pass it as patientPhone.",
      durationMs: 1,
      // Not placed by the report: goes by when the server got it (0:20).
      secondsFromStart: null,
      createdAt: "2026-11-17T16:00:20.000Z",
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
      startsAt: "2026-11-19T14:00:00.000Z",
      endsAt: "2026-11-19T15:00:00.000Z",
      patientName: "Maria Lopez",
      patientPhone: "+15551234567",
      newPatient: true,
      notes: null,
      createdAt: "2026-11-17T16:00:23.000Z",
    },
  ],
};

export const ASSISTANT: AssistantOverview = {
  assistant: {
    name: "Brightside Dental receptionist",
    firstMessage:
      "Thank you for calling Brightside Dental, this is Ava, the virtual assistant. How can I help you today?",
    endCallMessage: "Thanks for calling Brightside Dental. Have a great day!",
    model: {
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are Ava, the virtual receptionist at Brightside Dental.\n\n## How you speak\n- Ask one question at a time.",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "check_availability",
            description: "Find free appointment times for a service in the clinic's calendar.",
            parameters: {
              properties: {
                serviceId: { type: "string", description: "What the visit is for." },
                timeOfDay: { type: "string", enum: ["morning", "afternoon", "any"] },
              },
              required: ["serviceId"],
            },
          },
          messages: [{ type: "request-start", content: "Let me check the schedule." }],
        },
        {
          type: "transferCall",
          destinations: [
            {
              type: "number",
              number: "+15550142300",
              message: "Sure, I'm putting you through to the front desk now. Please hold.",
              description: "The front desk at Brightside Dental",
            },
          ],
        },
        { type: "endCall" },
      ],
    },
    voice: { provider: "vapi", voiceId: "Savannah" },
    transcriber: {
      provider: "deepgram",
      model: "nova-3",
      language: "en",
      keyterm: ["Brightside Dental", "Okafor"],
    },
    maxDurationSeconds: 900,
    silenceTimeoutSeconds: 30,
    server: { url: "https://receptionist.example.com/vapi/webhook" },
  },
  setup: {
    webhookUrl: "https://receptionist.example.com/vapi/webhook",
    transferNumber: "+15550142300",
    apiKey: true,
    assistantId: null,
    phoneNumberId: null,
    model: "anthropic/claude-sonnet-5-5",
  },
};

export const STATS: CallStats = {
  callLog: "memory",
  timezone: "America/Chicago",
  from: "2026-11-11",
  to: "2026-11-17",
  days: 7,
  totals: { calls: 12, booked: 5, transferred: 2, bookingRate: 0.5, averageDurationSeconds: 95 },
  outcomes: {
    booked: 5,
    transferred: 2,
    answered: 3,
    "hung-up": 2,
    failed: 0,
    "in-progress": 0,
    unknown: 0,
  },
  perDay: [
    { date: "2026-11-11", calls: 1, booked: 0 },
    { date: "2026-11-12", calls: 2, booked: 1 },
    { date: "2026-11-13", calls: 0, booked: 0 },
    { date: "2026-11-14", calls: 0, booked: 0 },
    { date: "2026-11-15", calls: 3, booked: 1 },
    { date: "2026-11-16", calls: 4, booked: 2 },
    { date: "2026-11-17", calls: 2, booked: 1 },
  ],
};
