import { z } from "zod";
import { type Availability, BookingError, type BookingService } from "../booking/service.ts";
import type { Clinic } from "../clinic/schema.ts";
import { DATE_RE } from "../calendar/time.ts";
import { ToolError, type ToolHandler } from "../vapi/tools.ts";

export const CHECK_AVAILABILITY = "check_availability";

export function checkAvailabilityDefinition(clinic: Clinic) {
  return {
    type: "function",
    function: {
      name: CHECK_AVAILABILITY,
      description:
        "Find free appointment times for a service in the clinic's calendar. Call it before offering any time; never suggest a time it didn't return. If the caller names a day, pass it as date.",
      parameters: {
        type: "object",
        properties: {
          serviceId: {
            type: "string",
            enum: clinic.services.map((s) => s.id),
            description: `What the visit is for: ${clinic.services
              .map((s) => `${s.id} (${s.name}, ${s.durationMinutes} min)`)
              .join(
                "; ",
              )}. Pain, swelling or a broken tooth is "emergency"; a first visit for an adult is "new-patient-exam".`,
          },
          date: {
            type: "string",
            description:
              "The day the caller asked for, as YYYY-MM-DD. Work out 'tomorrow' or 'next Tuesday' from today's date. Leave out for the soonest times.",
          },
          timeOfDay: {
            type: "string",
            enum: ["morning", "afternoon", "any"],
            description: "Morning is before noon. Default: any.",
          },
          providerId: {
            type: "string",
            enum: clinic.providers.map((p) => p.id),
            description: `Only when the caller asks for someone: ${clinic.providers
              .map((p) => `${p.id} (${p.name})`)
              .join("; ")}.`,
          },
        },
        required: ["serviceId"],
      },
    },
  } as const;
}

const argsSchema = z.object({
  serviceId: z.string().trim().min(1),
  date: z.string().trim().regex(DATE_RE, "date must be YYYY-MM-DD").optional(),
  timeOfDay: z.enum(["morning", "afternoon", "any"]).optional(),
  providerId: z.string().trim().min(1).optional(),
});

const OFFER =
  "Offer two or three of these times, saying the day and the time. When the caller picks one, confirm their full name and phone number, then call book_appointment with that slot's start and providerId.";

export function toAvailabilityResult(a: Availability) {
  const slots = a.slots.map(({ start, spoken, provider, providerId }) => ({
    start,
    spoken,
    provider,
    providerId,
  }));
  const instruction =
    slots.length === 0
      ? "There are no free times to offer. Apologize, and offer to transfer the caller to the front desk."
      : a.note
        ? `Tell the caller: ${a.note} ${OFFER}`
        : OFFER;

  return {
    today: a.today,
    service: a.service.name,
    durationMinutes: a.service.durationMinutes,
    ...(a.requestedDate ? { requestedDate: a.requestedDate } : {}),
    ...(a.requestedDateAvailable === undefined
      ? {}
      : { requestedDateAvailable: a.requestedDateAvailable }),
    ...(a.note ? { note: a.note } : {}),
    slots,
    instruction,
  };
}

export function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join("; ");
}

export function checkAvailability(booking: BookingService): ToolHandler {
  return async (args, { log }) => {
    const parsed = argsSchema.safeParse(args);

    if (!parsed.success) {
      throw new ToolError(`Invalid arguments. ${describeIssues(parsed.error)}`);
    }

    const { serviceId, date, timeOfDay, providerId } = parsed.data;

    try {
      const availability = await booking.availability({
        serviceId,
        ...(date ? { date } : {}),
        ...(timeOfDay ? { timeOfDay } : {}),
        ...(providerId ? { providerId } : {}),
      });
      log.info(
        { ...parsed.data, slots: availability.slots.map((s) => s.start) },
        "availability checked",
      );

      return toAvailabilityResult(availability);
    } catch (err) {
      if (err instanceof BookingError) {
        throw new ToolError(err.message);
      }

      throw err;
    }
  };
}
