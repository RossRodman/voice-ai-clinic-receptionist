export type CallStatus = "in-progress" | "ended";

export type CallOutcome = "booked" | "transferred" | "answered" | "hung-up" | "failed";

export interface TranscriptTurn {
  role: "assistant" | "caller";
  text: string;
  secondsFromStart: number;
}

export interface CallRow {
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
  transcript: TranscriptTurn[];
  recordingUrl: string | null;
  cost: number | null;
}

export interface ToolCallRow {
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

export interface BookingRow {
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

export type CallUpdate = Pick<CallRow, "id"> & Partial<Omit<CallRow, "id">>;
export type ToolCallUpdate = Pick<ToolCallRow, "id" | "callId" | "name"> &
  Partial<Omit<ToolCallRow, "id" | "callId" | "name" | "createdAt">>;
export type NewBooking = Omit<BookingRow, "createdAt">;

export type CallSummary = Omit<CallRow, "transcript" | "recordingUrl" | "cost">;

export interface CallDetail extends CallRow {
  toolCalls: ToolCallRow[];
  bookings: BookingRow[];
}

export type CallStoreKind = "supabase" | "memory";

export type CallFilterOutcome = CallOutcome | "in-progress";

export interface CallQuery {
  limit: number;
  outcome?: CallFilterOutcome;
  /** ISO instant, inclusive. */
  from?: string;
  /** ISO instant, exclusive. */
  to?: string;
  /** Matches the caller's number or the summary. */
  search?: string;
}

export type CallStat = Pick<CallRow, "startedAt" | "status" | "outcome" | "durationSeconds">;

export interface CallStore {
  readonly kind: CallStoreKind;
  openCall(call: CallUpdate): Promise<void>;
  saveCall(call: CallUpdate): Promise<void>;
  saveToolCalls(rows: ToolCallUpdate[]): Promise<void>;
  saveBooking(booking: NewBooking): Promise<void>;
  listCalls(query: CallQuery): Promise<CallSummary[]>;
  listCallStats(from: string): Promise<CallStat[]>;
  getCall(id: string): Promise<CallDetail | null>;
}

export class CallStoreError extends Error {
  override name = "CallStoreError";
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}
