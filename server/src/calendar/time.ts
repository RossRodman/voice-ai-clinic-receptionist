import { WEEKDAYS, type Weekday } from "../clinic/schema.ts";

export const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export interface LocalDateTime {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  minutes: number;
}

export function toLocal(instant: Date, timeZone: string): LocalDateTime {
  const parts: Record<string, string> = {};
  for (const { type, value } of partsFormatter(timeZone).formatToParts(instant)) {
    parts[type] = value;
  }
  const time = `${parts.hour}:${parts.minute}`;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function offsetMinutes(instant: Date, timeZone: string): number {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFormatter(timeZone).formatToParts(instant)) {
    p[type] = Number(value);
  }

  const asUtc = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

export function fromLocal(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);

  const first = offsetMinutes(new Date(wall), timeZone);
  const guess = wall - first * 60_000;
  const second = offsetMinutes(new Date(guess), timeZone);

  if (second === first) return new Date(guess);

  const retry = wall - second * 60_000;
  return offsetMinutes(new Date(retry), timeZone) === second ? new Date(retry) : new Date(guess);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function isValidDate(date: string): boolean {
  return DATE_RE.test(date) && addDays(date, 0) === date;
}

export function weekdayOf(date: string): Weekday {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return WEEKDAYS[(day + 6) % 7]!;
}

export function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function toZonedIso(instant: Date, timeZone: string): string {
  const { date, time } = toLocal(instant, timeZone);
  const offset = offsetMinutes(instant, timeZone);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);

  return `${date}T${time}:00${sign}${fromMinutes(abs)}`;
}

export function spokenDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}
