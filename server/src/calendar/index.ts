import type { Clinic } from "../clinic/schema.ts";
import type { Config } from "../config.ts";
import { demoCalendar } from "./demo.ts";
import { GoogleCalendar } from "./google.ts";
import { ServiceAccountAuth } from "./googleAuth.ts";
import type { CalendarClient } from "./types.ts";

export function createCalendar(config: Config, clinic: Clinic): CalendarClient {
  if (!config.googleCalendar) {
    return demoCalendar(clinic, new Date());
  }

  const { calendarId, serviceAccount } = config.googleCalendar;

  return new GoogleCalendar({
    calendarId,
    timeZone: clinic.timezone,
    providerIds: clinic.providers.map((p) => p.id),
    auth: new ServiceAccountAuth(serviceAccount),
  });
}
