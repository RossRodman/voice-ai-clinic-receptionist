import { z } from "zod";
import {
  BookingError,
  type BookingResult,
  type BookingService,
} from "../booking/service.ts";
import type { Clinic } from "../clinic/schema.ts";
import { ToolError, type ToolHandler } from "../vapi/tools.ts";
import { describeIssues } from "./checkAvailability.ts";

export const BOOK_APPOINTMENT = "book_appointment";

export function bookAppointmentDefinition(clinic: Clinic) {
  return {
    type: "function",
    function: {
      name: BOOK_APPOINTMENT,
      description:
        "Book an appointment in the clinic's calendar. Only for a time check_availability returned and the caller chose, after confirming their name and phone number. The time is checked again before booking.",
      parameters: {
        type: "object",
        properties: {
          serviceId: {
            type: "string",
            enum: clinic.services.map((s) => s.id),
            description: "The same serviceId passed to check_availability.",
          },
          start: {
            type: "string",
            description:
              "The chosen slot's start, exactly as check_availability returned it.",
          },
          providerId: {
            type: "string",
            enum: clinic.providers.map((p) => p.id),
            description: "The chosen slot's providerId.",
          },
          patientName: {
            type: "string",
            description:
              "The patient's full name, first and last. For a child, the child's name.",
          },
          patientPhone: {
            type: "string",
            description:
              "A phone number to reach the patient. Leave out to use the number they are calling from, after asking whether it's the best one.",
          },
          newPatient: {
            type: "boolean",
            description:
              "Whether this is the patient's first visit to the clinic.",
          },
          notes: {
            type: "string",
            description:
              "Anything the dentist should know, briefly: the problem in the caller's words, a child's age, a preference.",
          },
        },
        required: ["serviceId", "start", "patientName"],
      },
    },
  } as const;
}

const argsSchema = z.object({
  serviceId: z.string().trim().min(1),
  start: z.string().trim().min(1),
  providerId: z.string().trim().min(1).optional(),
  patientName: z.string().trim().min(2).max(100),
  patientPhone: z.string().trim().min(1).max(40).optional(),
  newPatient: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
});

export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

export function toBookingResult(result: BookingResult) {
  if (result.status === "unavailable") {
    const alternatives = result.alternatives.map((
      { start, spoken, provider, providerId },
    ) => ({
      start,
      spoken,
      provider,
      providerId,
    }));
    return {
      booked: false,
      reason: result.reason,
      alternatives,
      instruction: alternatives.length > 0
        ? "Nothing was booked. Tell the caller why, offer two or three of the alternatives, and book the one they choose."
        : "Nothing was booked. Tell the caller why and ask for another day, or offer to transfer them to the front desk.",
    };
  }

  const a = result.appointment;
  return {
    booked: true,
    appointmentId: a.id,
    service: a.service,
    when: a.spoken,
    durationMinutes: a.durationMinutes,
    provider: a.provider,
    patientName: a.patientName,
    patientPhone: a.patientPhone,
    ...(result.alreadyBooked ? { alreadyBooked: true } : {}),
    instruction:
      "The appointment is booked. Read back the service, the day and time, and who it is with, then ask if there is anything else.",
  };
}

export function bookAppointment(booking: BookingService): ToolHandler {
  return async (args, { call, log }) => {
    const parsed = argsSchema.safeParse(args);
    if (!parsed.success) {
      throw new ToolError(`Invalid arguments. ${describeIssues(parsed.error)}`);
    }
    const { patientPhone: given, ...rest } = parsed.data;

    const rawPhone = given ?? call?.customer?.number;
    if (!rawPhone) {
      throw new ToolError(
        "No phone number: ask the caller for one and pass it as patientPhone.",
      );
    }
    const patientPhone = normalizePhone(rawPhone);
    if (!patientPhone) {
      throw new ToolError(
        `"${rawPhone}" is not a full phone number. Ask the caller to repeat it.`,
      );
    }

    try {
      const result = await booking.book({
        ...rest,
        patientPhone,
        ...(call?.id ? { callId: call.id } : {}),
      });
      log.info(
        {
          serviceId: rest.serviceId,
          start: rest.start,
          status: result.status,
          ...(result.status === "booked"
            ? {
              appointmentId: result.appointment.id,
              alreadyBooked: result.alreadyBooked,
            }
            : { reason: result.reason }),
        },
        "booking",
      );
      return toBookingResult(result);
    } catch (err) {
      if (err instanceof BookingError) throw new ToolError(err.message);
      throw err;
    }
  };
}
