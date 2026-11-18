export interface Health {
  status: "ok";
  uptime: number;
}

export interface HoursLine {
  days: string;
  hours: string;
}

export interface Provider {
  id: string;
  name: string;
  title: string;
  role: string;
  bio: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: string;
  providers: string[];
}

export interface BookingRules {
  slotMinutes: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
}

export type CalendarKind = "google" | "demo";

export type CallLogKind = "supabase" | "memory";

export interface Clinic {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  timezone: string;
  hours: HoursLine[];
  providers: Provider[];
  services: Service[];
  insurance: { inNetwork: string[]; notAccepted: string[]; notes: string };
  languages: string[];
  booking: BookingRules;
  calendar: CalendarKind;
  callLog: CallLogKind;
}

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  source: "clinic" | "faq";
  serviceId?: string;
}

export type ToolResult =
  | { found: true; answers: { topic: string; answer: string; serviceId?: string }[] }
  | { found: false; instruction: string };

export interface SearchResponse {
  query: string;
  found: boolean;
  terms: string[];
  coverage: number;
  hits: (KnowledgeEntry & { score: number })[];
  toolResult: ToolResult;
}

export type TimeOfDay = "morning" | "afternoon" | "any";

export interface OfferedSlot {
  start: string;
  spoken: string;
  provider: string;
  providerId: string;
}

export interface AvailabilityToolResult {
  today: string;
  service: string;
  durationMinutes: number;
  requestedDate?: string;
  requestedDateAvailable?: boolean;
  note?: string;
  slots: OfferedSlot[];
  instruction: string;
}

export interface ScheduleSlot {
  start: string;
  time: string;
  label: string;
  providerIds: string[];
}

export interface ScheduleDay {
  date: string;
  label: string;
  closed: boolean;
  slots: ScheduleSlot[];
}

export interface ScheduleResponse {
  calendar: CalendarKind;
  today: string;
  days: ScheduleDay[];
}

export interface ScheduleParams {
  serviceId: string;
  from?: string;
  days?: number;
  providerId?: string;
}

export interface AvailabilityParams {
  serviceId: string;
  date?: string;
  timeOfDay?: TimeOfDay;
  providerId?: string;
}

export interface Appointment {
  id: string;
  serviceId: string;
  service: string;
  providerId: string;
  provider: string;
  start: string;
  end: string;
  spoken: string;
  durationMinutes: number;
  patientName: string;
  patientPhone: string;
  newPatient?: boolean;
  notes?: string;
  callId?: string;
}

export type CallStatus = "in-progress" | "ended";

export type CallOutcome = "booked" | "transferred" | "answered" | "hung-up" | "failed";

export interface CallSummary {
  id: string;
  status: CallStatus;
  type: string | null;
  customerNumber: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  endedReason: string | null;
  outcome: CallOutcome | null;
  summary: string | null;
}

export interface TranscriptTurn {
  role: "assistant" | "caller";
  text: string;
  secondsFromStart: number;
}

export interface ToolCallRecord {
  id: string;
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  error: string | null;
  durationMs: number | null;
  secondsFromStart: number | null;
  createdAt: string;
}

export interface BookingRecord {
  id: string;
  callId: string | null;
  serviceId: string;
  service: string;
  providerId: string;
  provider: string;
  startsAt: string;
  endsAt: string;
  patientName: string;
  patientPhone: string;
  newPatient: boolean | null;
  notes: string | null;
  createdAt: string;
}

export interface CallDetail extends CallSummary {
  transcript: TranscriptTurn[];
  recordingUrl: string | null;
  cost: number | null;
  toolCalls: ToolCallRecord[];
  bookings: BookingRecord[];
}

export interface AssistantSetup {
  webhookUrl: string | null;
  transferNumber: string | null;
  apiKey: boolean;
  assistantId: string | null;
  phoneNumberId: string | null;
  model: string;
}

export interface FunctionParameter {
  type: string;
  description?: string;
  enum?: string[];
}

export interface FunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: { properties: Record<string, FunctionParameter>; required?: string[] };
  };
  messages?: { type: string; content: string }[];
}

export interface TransferTool {
  type: "transferCall";
  destinations: { type: string; number: string; message: string; description: string }[];
}

export interface EndCallTool {
  type: "endCall";
}

export type AssistantTool = FunctionTool | TransferTool | EndCallTool;

export interface VapiAssistant {
  name: string;
  firstMessage: string;
  endCallMessage: string;
  model: {
    provider: string;
    model: string;
    temperature: number;
    messages: { role: string; content: string }[];
    tools: AssistantTool[];
  };
  voice: { provider: string; voiceId: string };
  transcriber: { provider: string; model: string; language: string; keyterm?: string[] };
  maxDurationSeconds: number;
  silenceTimeoutSeconds: number;
  server: { url: string };
}

export interface AssistantOverview {
  assistant: VapiAssistant;
  setup: AssistantSetup;
}

function queryString(params: object): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => [key, String(value)]);
  return new URLSearchParams(entries).toString();
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function describeError(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  for (const key of ["error", "message"] as const) {
    if (key in body) {
      const value: unknown = body[key as keyof typeof body];

      if (typeof value === "string") {
        return value;
      }
    }
  }

  return null;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    throw new ApiError(
      response.status,
      describeError(body) ?? `${init?.method ?? "GET"} ${url} failed (${response.status})`,
    );
  }

  return (await response.json()) as T;
}

export const api = {
  health: (signal?: AbortSignal) => request<Health>("/health", { signal }),
  clinic: (signal?: AbortSignal) => request<Clinic>("/api/clinic", { signal }),
  assistant: (signal?: AbortSignal) => request<AssistantOverview>("/api/assistant", { signal }),
  knowledgeBase: (signal?: AbortSignal) =>
    request<{ entries: KnowledgeEntry[] }>("/api/knowledge-base", { signal }),
  searchKnowledgeBase: (q: string, signal?: AbortSignal) =>
    request<SearchResponse>(`/api/knowledge-base/search?${new URLSearchParams({ q })}`, {
      signal,
    }),
  schedule: (params: ScheduleParams, signal?: AbortSignal) =>
    request<ScheduleResponse>(`/api/schedule?${queryString(params)}`, { signal }),
  availability: (params: AvailabilityParams, signal?: AbortSignal) =>
    request<{ toolResult: AvailabilityToolResult }>(`/api/availability?${queryString(params)}`, {
      signal,
    }),
  calls: (signal?: AbortSignal) =>
    request<{ callLog: CallLogKind; calls: CallSummary[] }>("/api/calls", { signal }),
  call: (id: string, signal?: AbortSignal) =>
    request<{ callLog: CallLogKind; call: CallDetail }>(`/api/calls/${encodeURIComponent(id)}`, {
      signal,
    }),
  appointments: (signal?: AbortSignal) =>
    request<{ calendar: CalendarKind; appointments: Appointment[] }>("/api/appointments", {
      signal,
    }),
};
