import { addDays, fromLocal, toLocal } from "../calendar/time.ts";
import type { CallFilterOutcome, CallStat } from "./types.ts";

export interface StatsPeriod {
  /** The first day, YYYY-MM-DD in the clinic's time zone. */
  from: string;
  /** The last day, today. */
  to: string;
  days: number;
  /** The first day's midnight in the clinic's time zone, as an ISO instant. */
  since: string;
}

export interface DayStats {
  date: string;
  calls: number;
  booked: number;
}

export interface CallStats {
  from: string;
  to: string;
  days: number;
  totals: {
    calls: number;
    booked: number;
    transferred: number;
    /** Booked calls out of the calls that ended with a conversation, 0 to 1. */
    bookingRate: number | null;
    averageDurationSeconds: number | null;
  };
  outcomes: Record<CallFilterOutcome | "unknown", number>;
  perDay: DayStats[];
}

export function statsPeriod(days: number, now: Date, timeZone: string): StatsPeriod {
  const to = toLocal(now, timeZone).date;
  const from = addDays(to, -(days - 1));

  return { from, to, days, since: fromLocal(from, "00:00", timeZone).toISOString() };
}

export function callStats(calls: CallStat[], period: StatsPeriod, timeZone: string): CallStats {
  const perDay = new Map<string, DayStats>();

  for (let i = 0; i < period.days; i++) {
    const date = addDays(period.from, i);
    perDay.set(date, { date, calls: 0, booked: 0 });
  }

  const outcomes: CallStats["outcomes"] = {
    booked: 0,
    transferred: 0,
    answered: 0,
    "hung-up": 0,
    failed: 0,
    "in-progress": 0,
    unknown: 0,
  };

  let counted = 0;
  let durationTotal = 0;
  let durationCount = 0;

  for (const call of calls) {
    const day = perDay.get(toLocal(new Date(call.startedAt), timeZone).date);

    if (!day) {
      continue;
    }

    counted++;
    day.calls++;

    if (call.status === "in-progress") {
      outcomes["in-progress"]++;
      continue;
    }

    outcomes[call.outcome ?? "unknown"]++;

    if (call.outcome === "booked") {
      day.booked++;
    }

    if (call.durationSeconds !== null) {
      durationTotal += call.durationSeconds;
      durationCount++;
    }
  }

  const conversations = counted - outcomes["in-progress"] - outcomes["hung-up"];

  return {
    from: period.from,
    to: period.to,
    days: period.days,
    totals: {
      calls: counted,
      booked: outcomes.booked,
      transferred: outcomes.transferred,
      bookingRate: conversations > 0 ? outcomes.booked / conversations : null,
      averageDurationSeconds: durationCount > 0 ? Math.round(durationTotal / durationCount) : null,
    },
    outcomes,
    perDay: [...perDay.values()],
  };
}
