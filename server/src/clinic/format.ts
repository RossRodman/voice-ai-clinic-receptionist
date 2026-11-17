import { WEEKDAYS, type Clinic, type Price, type Weekday } from "./schema.ts";

const DAY_NAMES: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatTime(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);

  if (h === 12 && m === 0) return "noon";

  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? "AM" : "PM";

  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatPrice(price: Price): string {
  const base =
    price.amount === 0 ? "free" : `${price.from ? "from " : ""}${dollars.format(price.amount)}`;
  return price.note ? `${base} (${price.note})` : base;
}

export interface HoursLine {
  days: string;
  hours: string;
}

export function hoursLines(hours: Clinic["hours"]): HoursLine[] {
  const describe = (day: Weekday) =>
    hours[day].length === 0
      ? "closed"
      : hours[day].map(([open, close]) => `${formatTime(open)} to ${formatTime(close)}`).join(", ");

  const lines: HoursLine[] = [];

  let start = 0;

  for (let i = 1; i <= WEEKDAYS.length; i++) {
    const day = WEEKDAYS[i];
    const startDay = WEEKDAYS[start]!;

    if (day && describe(day) === describe(startDay)) continue;

    const endDay = WEEKDAYS[i - 1]!;
    const span = i - 1 - start;
    const days =
      span === 0
        ? DAY_NAMES[startDay]
        : `${DAY_NAMES[startDay]} ${span === 1 ? "and" : "to"} ${DAY_NAMES[endDay]}`;

    lines.push({ days, hours: describe(startDay) });
    start = i;
  }
  return lines;
}

export function joinList(items: readonly string[], conjunction = "and"): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items.at(-1)}`;
}
