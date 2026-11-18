export const BOOKED_BY = "ai-receptionist";

export interface AppointmentDetails {
  serviceId: string;
  providerId: string;
  patientName: string;
  patientPhone: string;
  newPatient?: boolean;
  notes?: string;
  callId?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  providerId?: string;
  appointment?: AppointmentDetails;
}

export interface NewEvent {
  summary: string;
  description: string;
  start: Date;
  end: Date;
  appointment: AppointmentDetails;
}

export interface CalendarClient {
  readonly kind: "google" | "demo";
  listEvents(from: Date, to: Date): Promise<CalendarEvent[]>;
  createEvent(event: NewEvent): Promise<CalendarEvent>;
}

export class CalendarError extends Error {
  override name = "CalendarError";

  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}
