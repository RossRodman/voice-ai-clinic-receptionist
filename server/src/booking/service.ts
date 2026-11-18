import { formatTime, joinList } from "../clinic/format.ts";
import type { Clinic, Service } from "../clinic/schema.ts";
import {
  addDays,
  fromLocal,
  isValidDate,
  spokenDate,
  toLocal,
  toZonedIso,
  weekdayOf,
} from "../calendar/time.ts";
import type { CalendarClient, CalendarEvent } from "../calendar/types.ts";
import {
  bookingWindow,
  candidateStarts,
  freeSlots,
  isProviderFree,
  matchesTimeOfDay,
  pickSlots,
  type Slot,
  type TimeOfDay,
} from "./slots.ts";

export class BookingError extends Error {
  override name = "BookingError";
}

export interface OfferedSlot {
  start: string;
  date: string;
  time: string;
  spoken: string;
  providerId: string;
  provider: string;
}

export interface AvailabilityRequest {
  serviceId: string;
  date?: string;
  timeOfDay?: TimeOfDay;
  providerId?: string;
}

export interface Availability {
  today: string;
  service: { id: string; name: string; durationMinutes: number };
  requestedDate?: string;
  requestedDateAvailable?: boolean;
  slots: OfferedSlot[];
  note?: string;
}

export interface BookingRequest {
  serviceId: string;
  start: string;
  providerId?: string;
  patientName: string;
  patientPhone: string;
  newPatient?: boolean;
  notes?: string;
  callId?: string;
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

export type BookingResult =
  | { status: "booked"; appointment: Appointment; alreadyBooked: boolean }
  | { status: "unavailable"; reason: string; alternatives: OfferedSlot[] };

export interface ScheduleDay {
  date: string;
  label: string;
  closed: boolean;
  slots: {
    start: string;
    time: string;
    label: string;
    providerIds: string[];
  }[];
}

const DAYS_OFFERED = 3;
const CHUNK_DAYS = 14;

const LOCAL_START = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::00(?:\.0+)?)?(Z|[+-]\d{2}:\d{2})?$/;

class Mutex {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task);
    this.tail = result.catch(() => undefined);

    return result;
  }
}

export class BookingService {
  readonly clinic: Clinic;
  readonly calendar: CalendarClient;
  private readonly now: () => Date;
  private readonly lock = new Mutex();
  private readonly bookedListeners: ((appointment: Appointment) => void)[] = [];

  constructor(clinic: Clinic, calendar: CalendarClient, now: () => Date = () => new Date()) {
    this.clinic = clinic;
    this.calendar = calendar;
    this.now = now;
  }

  onBooked(listener: (appointment: Appointment) => void) {
    this.bookedListeners.push(listener);
  }

  today(): string {
    return bookingWindow(this.clinic, this.now()).today;
  }

  service(serviceId: string): Service {
    const service = this.clinic.services.find((s) => s.id === serviceId);

    if (!service) {
      throw new BookingError(
        `Unknown service "${serviceId}". Use one of: ${this.clinic.services
          .map((s) => s.id)
          .join(", ")}.`,
      );
    }

    return service;
  }

  providerName(providerId: string): string {
    return this.clinic.providers.find((p) => p.id === providerId)?.name ?? providerId;
  }

  private checkProvider(service: Service, providerId: string | undefined): void {
    if (providerId === undefined || service.providers.includes(providerId)) {
      return;
    }

    const known = this.clinic.providers.some((p) => p.id === providerId);
    const who = joinList(
      service.providers.map((p) => `${this.providerName(p)} (${p})`),
      "or",
    );

    throw new BookingError(
      known
        ? `${this.providerName(
            providerId,
          )} doesn't do ${service.name.toLowerCase()}. It is done by ${who}.`
        : `Unknown provider "${providerId}". ${service.name} is done by ${who}.`,
    );
  }

  private offer(slot: Slot, providerId?: string): OfferedSlot {
    const chosen = providerId ?? slot.providerIds[0]!;

    return {
      start: toZonedIso(slot.start, this.clinic.timezone),
      date: slot.date,
      time: slot.time,
      spoken: `${spokenDate(slot.date)} at ${formatTime(slot.time)}`,
      providerId: chosen,
      provider: this.providerName(chosen),
    };
  }

  private dayStart(date: string): Date {
    return fromLocal(date, "00:00", this.clinic.timezone);
  }

  private eventsBetween(first: string, last: string): Promise<CalendarEvent[]> {
    return this.calendar.listEvents(this.dayStart(first), this.dayStart(addDays(last, 1)));
  }

  private async scanDays(
    service: Service,
    from: string,
    days: number,
    filter: { timeOfDay: TimeOfDay; providerId?: string },
  ): Promise<Slot[][]> {
    const { lastDate } = bookingWindow(this.clinic, this.now());
    const found: Slot[][] = [];

    for (let chunk = from; chunk <= lastDate && found.length < days;) {
      const chunkEnd = [addDays(chunk, CHUNK_DAYS - 1), lastDate].sort()[0]!;
      const events = await this.eventsBetween(chunk, chunkEnd);

      for (let date = chunk; date <= chunkEnd && found.length < days; date = addDays(date, 1)) {
        const slots = freeSlots(this.clinic, service, date, events, this.now(), {
          providerId: filter.providerId,
        }).filter((s) => matchesTimeOfDay(s, filter.timeOfDay));

        if (slots.length > 0) {
          found.push(slots);
        }
      }

      chunk = addDays(chunkEnd, 1);
    }

    return found;
  }

  async availability({
    serviceId,
    date,
    timeOfDay = "any",
    providerId,
  }: AvailabilityRequest): Promise<Availability> {
    const service = this.service(serviceId);
    this.checkProvider(service, providerId);
    const now = this.now();
    const window = bookingWindow(this.clinic, now);

    const base = {
      today: spokenDate(window.today),
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
      },
    };

    const offerDays = (days: Slot[][], perDay: number) =>
      days.flatMap((day) => pickSlots(day, perDay)).map((s) => this.offer(s, providerId));

    const filter = { timeOfDay, providerId };

    if (date === undefined) {
      const days = await this.scanDays(service, window.today, DAYS_OFFERED, filter);

      return {
        ...base,
        slots: offerDays(days, 2),
        ...(days.length === 0 ? { note: this.nothingFree(service, providerId) } : {}),
      };
    }

    if (!isValidDate(date)) {
      throw new BookingError(`"${date}" is not a date. Use YYYY-MM-DD.`);
    }

    if (date < window.today) {
      throw new BookingError(
        `${spokenDate(
          date,
        )} has passed. Today is ${base.today}; ask the caller which day they mean.`,
      );
    }

    const requested = { ...base, requestedDate: date };

    if (date > window.lastDate) {
      return {
        ...requested,
        requestedDateAvailable: false,
        slots: [],
        note: `Appointments can be booked up to ${this.clinic.booking.maxDaysAhead} days ahead, until ${spokenDate(
          window.lastDate,
        )}.`,
      };
    }

    const [first] = await this.scanDays(service, date, 1, filter);

    if (first?.[0]?.date === date) {
      return {
        ...requested,
        requestedDateAvailable: true,
        slots: offerDays([first], 4),
      };
    }

    const later = first
      ? [
          first,
          ...(await this.scanDays(service, addDays(first[0]!.date, 1), DAYS_OFFERED - 1, filter)),
        ]
      : [];

    return {
      ...requested,
      requestedDateAvailable: false,
      slots: offerDays(later, 2),
      note: this.whyNothingOn(date, timeOfDay, providerId),
    };
  }

  private whyNothingOn(date: string, timeOfDay: TimeOfDay, providerId?: string): string {
    const day = spokenDate(date);

    if (this.clinic.hours[weekdayOf(date)].length === 0) {
      return `The clinic is closed on ${day.split(",")[0]}s.`;
    }

    const part = timeOfDay === "any" ? "" : ` in the ${timeOfDay}`;
    const who = providerId ? ` with ${this.providerName(providerId)}` : "";

    return date === bookingWindow(this.clinic, this.now()).today
      ? `There is nothing left today${part}${who}.`
      : `${day} is fully booked${part}${who}.`;
  }

  private nothingFree(service: Service, providerId?: string): string {
    const who = providerId ? ` with ${this.providerName(providerId)}` : "";

    return `No free times for ${service.name.toLowerCase()}${who} in the next ${this.clinic.booking.maxDaysAhead} days.`;
  }

  parseStart(start: string): Date {
    const match = LOCAL_START.exec(start.trim());

    if (!match || !isValidDate(match[1]!)) {
      throw new BookingError(
        `"${start}" is not a start time. Pass the "start" of a slot from check_availability.`,
      );
    }

    const [, date, time, offset] = match as unknown as [string, string, string, string?];

    return offset === undefined
      ? fromLocal(date, time, this.clinic.timezone)
      : new Date(Date.parse(start.trim()));
  }

  async book(request: BookingRequest): Promise<BookingResult> {
    const service = this.service(request.serviceId);
    this.checkProvider(service, request.providerId);
    const start = this.parseStart(request.start);
    const { date, time } = toLocal(start, this.clinic.timezone);

    const alternatives = async () =>
      (
        await this.availability({
          serviceId: service.id,
          date,
          providerId: request.providerId,
        })
      ).slots.filter((s) => s.start !== toZonedIso(start, this.clinic.timezone));

    const unavailable = async (reason: string): Promise<BookingResult> => ({
      status: "unavailable",
      reason,
      alternatives:
        date >= bookingWindow(this.clinic, this.now()).today ? await alternatives() : [],
    });

    const candidate = candidateStarts(this.clinic, service, date, this.now()).find(
      (c) => c.start.getTime() === start.getTime(),
    );

    if (!candidate) {
      return unavailable(this.whyNotBookable(service, start, date, time));
    }

    return this.lock.run(async () => {
      const events = await this.eventsBetween(date, date);

      const existing = events.find(
        (e) =>
          e.appointment?.serviceId === service.id &&
          e.appointment.patientPhone === request.patientPhone &&
          e.start.getTime() === start.getTime(),
      );

      if (existing) {
        return {
          status: "booked",
          appointment: this.toAppointment(existing)!,
          alreadyBooked: true,
        };
      }

      const providerId = (request.providerId ? [request.providerId] : service.providers).find((p) =>
        isProviderFree(events, p, candidate.start, candidate.end),
      );

      if (!providerId) {
        const who = request.providerId ? ` with ${this.providerName(request.providerId)}` : "";

        return unavailable(`${spokenDate(date)} at ${formatTime(time)}${who} was just taken.`);
      }

      const event = await this.calendar.createEvent({
        summary: `${service.name}: ${request.patientName}`,
        description: this.describe(service, providerId, request),
        start: candidate.start,
        end: candidate.end,
        appointment: {
          serviceId: service.id,
          providerId,
          patientName: request.patientName,
          patientPhone: request.patientPhone,
          ...(request.newPatient === undefined ? {} : { newPatient: request.newPatient }),
          ...(request.notes ? { notes: request.notes } : {}),
          ...(request.callId ? { callId: request.callId } : {}),
        },
      });

      const appointment = this.toAppointment(event)!;

      for (const listener of this.bookedListeners) {
        listener(appointment);
      }

      return { status: "booked", appointment, alreadyBooked: false };
    });
  }

  private whyNotBookable(service: Service, start: Date, date: string, time: string): string {
    const now = this.now();
    const window = bookingWindow(this.clinic, now);
    const when = `${spokenDate(date)} at ${formatTime(time)}`;

    if (start <= now) {
      return `${when} has passed.`;
    }

    if (start < window.earliest) {
      const hours = this.clinic.booking.minNoticeMinutes / 60;

      return `${when} is too soon: appointments need ${hours} ${
        hours === 1 ? "hour" : "hours"
      } notice.`;
    }

    if (date > window.lastDate) {
      return `Appointments can be booked up to ${this.clinic.booking.maxDaysAhead} days ahead.`;
    }

    if (this.clinic.hours[weekdayOf(date)].length === 0) {
      return `The clinic is closed on ${spokenDate(date).split(",")[0]}s.`;
    }

    return `${when} is not an appointment time for ${service.name.toLowerCase()} (${service.durationMinutes} minutes) within opening hours.`;
  }

  private describe(service: Service, providerId: string, r: BookingRequest): string {
    return [
      `Patient: ${r.patientName}`,
      `Phone: ${r.patientPhone}`,
      `Service: ${service.name} (${service.durationMinutes} min)`,
      `With: ${this.providerName(providerId)}`,
      r.newPatient === undefined ? undefined : `New patient: ${r.newPatient ? "yes" : "no"}`,
      r.notes ? `Notes: ${r.notes}` : undefined,
      "",
      `Booked by the AI receptionist${r.callId ? ` (Vapi call ${r.callId})` : ""}.`,
    ]
      .filter((line) => line !== undefined)
      .join("\n");
  }

  toAppointment(event: CalendarEvent): Appointment | undefined {
    const a = event.appointment;

    if (!a) {
      return undefined;
    }

    const { date, time } = toLocal(event.start, this.clinic.timezone);
    const service = this.clinic.services.find((s) => s.id === a.serviceId);

    return {
      id: event.id,
      serviceId: a.serviceId,
      service: service?.name ?? a.serviceId,
      providerId: a.providerId,
      provider: this.providerName(a.providerId),
      start: toZonedIso(event.start, this.clinic.timezone),
      end: toZonedIso(event.end, this.clinic.timezone),
      spoken: `${spokenDate(date)} at ${formatTime(time)}`,
      durationMinutes: Math.round((event.end.getTime() - event.start.getTime()) / 60_000),
      patientName: a.patientName,
      patientPhone: a.patientPhone,
      ...(a.newPatient === undefined ? {} : { newPatient: a.newPatient }),
      ...(a.notes ? { notes: a.notes } : {}),
      ...(a.callId ? { callId: a.callId } : {}),
    };
  }

  async upcoming(days = 30): Promise<Appointment[]> {
    const now = this.now();
    const events = await this.calendar.listEvents(now, new Date(now.getTime() + days * 86_400_000));

    return events.flatMap((e) => this.toAppointment(e) ?? []);
  }

  async schedule(serviceId: string, from: string, days: number, providerId?: string) {
    const service = this.service(serviceId);
    this.checkProvider(service, providerId);

    if (!isValidDate(from)) {
      throw new BookingError(`"${from}" is not a date. Use YYYY-MM-DD.`);
    }

    const last = addDays(from, days - 1);
    const events = await this.eventsBetween(from, last);
    const now = this.now();

    const result: ScheduleDay[] = [];

    for (let date = from; date <= last; date = addDays(date, 1)) {
      result.push({
        date,
        label: spokenDate(date),
        closed: this.clinic.hours[weekdayOf(date)].length === 0,
        slots: freeSlots(this.clinic, service, date, events, now, {
          providerId,
        }).map((s) => ({
          start: toZonedIso(s.start, this.clinic.timezone),
          time: s.time,
          label: formatTime(s.time),
          providerIds: s.providerIds,
        })),
      });
    }

    return { today: bookingWindow(this.clinic, now).today, days: result };
  }
}
