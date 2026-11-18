import { z } from "zod";
import { fromLocal, toZonedIso } from "./time.ts";
import type { ServiceAccountAuth } from "./googleAuth.ts";
import {
  type AppointmentDetails,
  BOOKED_BY,
  type CalendarClient,
  CalendarError,
  type CalendarEvent,
  type NewEvent,
} from "./types.ts";

const API = "https://www.googleapis.com/calendar/v3";

const eventTime = z.object({
  dateTime: z.string().optional(),
  date: z.string().optional(),
});

const googleEvent = z.looseObject({
  id: z.string(),
  status: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  transparency: z.string().optional(),
  start: eventTime,
  end: eventTime,
  extendedProperties: z
    .looseObject({ private: z.record(z.string(), z.string()).optional() })
    .optional(),
});

type GoogleEvent = z.infer<typeof googleEvent>;

const eventList = z.looseObject({
  items: z.array(googleEvent).default([]),
  nextPageToken: z.string().optional(),
});

export interface GoogleCalendarOptions {
  calendarId: string;
  timeZone: string;
  providerIds: readonly string[];
  auth: Pick<ServiceAccountAuth, "token">;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export class GoogleCalendar implements CalendarClient {
  readonly kind = "google";
  private readonly options: GoogleCalendarOptions;
  private readonly fetchFn: typeof fetch;
  private readonly tagPattern: RegExp | undefined;

  constructor(options: GoogleCalendarOptions) {
    this.options = options;
    this.fetchFn = options.fetchFn ?? fetch;
    const ids = options.providerIds.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    this.tagPattern = ids.length ? new RegExp(`#(${ids.join("|")})\\b`) : undefined;
  }

  private get eventsUrl(): string {
    return `${API}/calendars/${encodeURIComponent(this.options.calendarId)}/events`;
  }

  private async request(url: string, init: RequestInit = {}): Promise<unknown> {
    const token = await this.options.auth.token();

    let response: Response;

    try {
      response = await this.fetchFn(url, {
        ...init,
        headers: {
          authorization: `Bearer ${token}`,
          ...(init.body ? { "content-type": "application/json" } : {}),
        },
        // A caller is waiting on the line.
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 5000),
      });
    } catch (err) {
      throw new CalendarError(`Google Calendar is unreachable: ${(err as Error).message}`);
    }

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message = z.object({ error: z.object({ message: z.string() }) }).safeParse(body);
      throw new CalendarError(
        `Google Calendar ${response.status}: ${
          message.success ? message.data.error.message : response.statusText
        }`,
        response.status,
      );
    }

    return body;
  }

  async listEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "2500",
        ...(pageToken ? { pageToken } : {}),
      });

      const page = eventList.parse(await this.request(`${this.eventsUrl}?${params}`));

      for (const item of page.items) {
        const event = this.fromGoogle(item);

        if (event) {
          events.push(event);
        }
      }

      pageToken = page.nextPageToken;
    } while (pageToken);

    return events;
  }

  async createEvent({
    summary,
    description,
    start,
    end,
    appointment,
  }: NewEvent): Promise<CalendarEvent> {
    const { timeZone } = this.options;
    const body = {
      summary,
      description,
      start: { dateTime: toZonedIso(start, timeZone), timeZone },
      end: { dateTime: toZonedIso(end, timeZone), timeZone },
      extendedProperties: { private: toPrivateProperties(appointment) },
    };

    const created = googleEvent.parse(
      await this.request(this.eventsUrl, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );

    const event = this.fromGoogle(created);

    if (!event) {
      throw new CalendarError("Google Calendar returned an event without times");
    }

    return event;
  }

  fromGoogle(item: GoogleEvent): CalendarEvent | null {
    if (item.status === "cancelled" || item.transparency === "transparent") {
      return null;
    }

    const start = this.instant(item.start);
    const end = this.instant(item.end);

    if (!start || !end) {
      return null;
    }

    const appointment = fromPrivateProperties(item.extendedProperties?.private);
    const summary = item.summary ?? "(busy)";
    const tagged = this.tagPattern?.exec(`${summary}\n${item.description ?? ""}`)?.[1];
    const providerId = appointment?.providerId ?? tagged;

    return {
      id: item.id,
      summary,
      start,
      end,
      ...(providerId ? { providerId } : {}),
      ...(appointment ? { appointment } : {}),
    };
  }

  private instant(time: z.infer<typeof eventTime>): Date | null {
    if (time.dateTime) {
      return new Date(time.dateTime);
    }
    // All-day events: midnight to midnight in the clinic's zone.
    if (time.date) {
      return fromLocal(time.date, "00:00", this.options.timeZone);
    }

    return null;
  }
}

export function toPrivateProperties(a: AppointmentDetails): Record<string, string> {
  return {
    bookedBy: BOOKED_BY,
    serviceId: a.serviceId,
    providerId: a.providerId,
    patientName: a.patientName,
    patientPhone: a.patientPhone,
    ...(a.newPatient === undefined ? {} : { newPatient: String(a.newPatient) }),
    ...(a.notes ? { notes: a.notes } : {}),
    ...(a.callId ? { callId: a.callId } : {}),
  };
}

export function fromPrivateProperties(
  p: Record<string, string> | undefined,
): AppointmentDetails | undefined {
  if (p?.bookedBy !== BOOKED_BY || !p.serviceId || !p.providerId) {
    return undefined;
  }

  return {
    serviceId: p.serviceId,
    providerId: p.providerId,
    patientName: p.patientName ?? "",
    patientPhone: p.patientPhone ?? "",
    ...(p.newPatient === undefined ? {} : { newPatient: p.newPatient === "true" }),
    ...(p.notes ? { notes: p.notes } : {}),
    ...(p.callId ? { callId: p.callId } : {}),
  };
}
