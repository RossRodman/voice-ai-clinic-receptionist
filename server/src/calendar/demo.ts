import type { Clinic } from "../clinic/schema.ts";
import { InMemoryCalendar } from "./memory.ts";
import { addDays, fromLocal, fromMinutes, toLocal, toMinutes, weekdayOf } from "./time.ts";

function random(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (text: string) =>
  [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

export function demoCalendar(clinic: Clinic, now: Date, days = 21): InMemoryCalendar {
  const calendar = new InMemoryCalendar();
  const today = toLocal(now, clinic.timezone).date;
  const slot = clinic.booking.slotMinutes;

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const hours = clinic.hours[weekdayOf(date)];

    for (const provider of clinic.providers) {
      const rand = random(hash(`${date}:${provider.id}`));

      for (const [open, close] of hours) {
        const from = toMinutes(open);
        const to = toMinutes(close);
        const lunch = from < 12 * 60 && to >= 14 * 60 ? 12 * 60 : undefined;

        if (lunch !== undefined) {
          calendar.add({
            summary: `Lunch #${provider.id}`,
            start: fromLocal(date, "12:00", clinic.timezone),
            end: fromLocal(date, "13:00", clinic.timezone),
            providerId: provider.id,
          });
        }

        for (let m = from; m < to; m += slot) {
          if (lunch !== undefined && m >= lunch && m < lunch + 60) {
            continue;
          }

          if (rand() > 0.22) {
            continue;
          }

          const length = slot * (1 + Math.floor(rand() * 3));
          const end = Math.min(m + length, to);
          calendar.add({
            summary: `Patient appointment #${provider.id}`,
            start: fromLocal(date, fromMinutes(m), clinic.timezone),
            end: fromLocal(date, fromMinutes(end), clinic.timezone),
            providerId: provider.id,
          });
          m = end;
        }
      }
    }
  }

  return calendar;
}
