import type { Clinic, Service } from "../clinic/schema.ts";
import type { CalendarEvent } from "../calendar/types.ts";
import {
  addDays,
  fromLocal,
  fromMinutes,
  toLocal,
  toMinutes,
  weekdayOf,
} from "../calendar/time.ts";

export interface Slot {
  start: Date;
  end: Date;
  /** YYYY-MM-DD in the clinic's time zone. */
  date: string;
  /** HH:MM in the clinic's time zone. */
  time: string;
  providerIds: string[];
}

export interface Window {
  earliest: Date;
  today: string;
  lastDate: string;
}

export function bookingWindow(clinic: Clinic, now: Date): Window {
  const today = toLocal(now, clinic.timezone).date;

  return {
    earliest: new Date(now.getTime() + clinic.booking.minNoticeMinutes * 60_000),
    today,
    lastDate: addDays(today, clinic.booking.maxDaysAhead),
  };
}

export function candidateStarts(clinic: Clinic, service: Service, date: string, now: Date) {
  const window = bookingWindow(clinic, now);
  if (date < window.today || date > window.lastDate) return [];

  const { slotMinutes } = clinic.booking;
  const starts: { start: Date; end: Date; time: string }[] = [];

  for (const [open, close] of clinic.hours[weekdayOf(date)]) {
    const closeAt = toMinutes(close);

    for (let m = toMinutes(open); m + service.durationMinutes <= closeAt; m += slotMinutes) {
      const time = fromMinutes(m);
      const start = fromLocal(date, time, clinic.timezone);

      if (start < window.earliest) continue;

      const end = new Date(start.getTime() + service.durationMinutes * 60_000);
      starts.push({ start, end, time });
    }
  }

  return starts;
}

const overlaps = (event: CalendarEvent, start: Date, end: Date) =>
  event.start < end && event.end > start;

export function isProviderFree(
  events: readonly CalendarEvent[],
  providerId: string,
  start: Date,
  end: Date,
): boolean {
  return !events.some(
    (e) => (e.providerId === undefined || e.providerId === providerId) && overlaps(e, start, end),
  );
}

export interface SlotOptions {
  providerId?: string;
}

export function freeSlots(
  clinic: Clinic,
  service: Service,
  date: string,
  events: readonly CalendarEvent[],
  now: Date,
  { providerId }: SlotOptions = {},
): Slot[] {
  const providers = providerId
    ? service.providers.filter((p) => p === providerId)
    : service.providers;

  return candidateStarts(clinic, service, date, now).flatMap(({ start, end, time }) => {
    const providerIds = providers.filter((p) => isProviderFree(events, p, start, end));
    return providerIds.length > 0 ? [{ start, end, date, time, providerIds }] : [];
  });
}

export type TimeOfDay = "morning" | "afternoon" | "any";

export function matchesTimeOfDay(slot: Pick<Slot, "time">, timeOfDay: TimeOfDay): boolean {
  if (timeOfDay === "any") return true;
  const isMorning = toMinutes(slot.time) < 12 * 60;
  return timeOfDay === "morning" ? isMorning : !isMorning;
}

export function pickSlots(slots: readonly Slot[], perDay: number, spreadMinutes = 120): Slot[] {
  const byDate = new Map<string, Slot[]>();
  for (const slot of slots) byDate.set(slot.date, [...(byDate.get(slot.date) ?? []), slot]);
  const picked: Slot[] = [];

  for (const daySlots of byDate.values()) {
    const chosen: Slot[] = [];

    for (const slot of daySlots) {
      if (chosen.length >= perDay) break;
      const last = chosen.at(-1);
      if (!last || slot.start.getTime() - last.start.getTime() >= spreadMinutes * 60_000) {
        chosen.push(slot);
      }
    }

    while (chosen.length < perDay) {
      let best: Slot | undefined;
      let bestGap = -1;

      for (const slot of daySlots) {
        if (chosen.includes(slot)) continue;
        const gap = Math.min(
          ...chosen.map((c) => Math.abs(slot.start.getTime() - c.start.getTime())),
        );
        if (gap > bestGap) [best, bestGap] = [slot, gap];
      }

      if (!best) break;
      chosen.push(best);
    }

    picked.push(...chosen.toSorted((a, b) => a.start.getTime() - b.start.getTime()));
  }

  return picked;
}
