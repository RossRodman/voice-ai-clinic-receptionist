import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { BookingError, type BookingService } from "../booking/service.ts";
import { DATE_RE } from "../calendar/time.ts";
import { formatPrice, hoursLines } from "../clinic/format.ts";
import type { ClinicData } from "../knowledgeBase/load.ts";
import { toAvailabilityResult } from "../tools/checkAvailability.ts";
import { toToolResult } from "../tools/searchKnowledgeBase.ts";

const searchQuery = z.object({ q: z.string().trim().min(1).max(300) });

const date = z.string().regex(DATE_RE, "must be YYYY-MM-DD");

const availabilityQuery = z.object({
  serviceId: z.string().min(1),
  date: date.optional(),
  timeOfDay: z.enum(["morning", "afternoon", "any"]).optional(),
  providerId: z.string().min(1).optional(),
});

const scheduleQuery = z.object({
  serviceId: z.string().min(1),
  from: date.optional(),
  days: z.coerce.number().int().min(1).max(31).default(7),
  providerId: z.string().min(1).optional(),
});

const firstIssue = (error: z.ZodError) => {
  const issue = error.issues[0]!;
  return issue.path.length ? `${issue.path.join(".")} ${issue.message}` : issue.message;
};

export interface ApiRoutesOptions extends ClinicData {
  booking: BookingService;
}

export const apiRoutes: FastifyPluginAsync<ApiRoutesOptions> = async (
  app,
  { clinic, knowledgeBase, booking },
) => {
  app.setErrorHandler((err, request, reply) => {
    if (err instanceof BookingError) return reply.code(400).send({ error: err.message });
    request.log.error({ err }, "api request failed");
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    return reply.code(status).send({
      error: status >= 500 ? "Something went wrong on the server" : (err as Error).message,
    });
  });

  app.get("/clinic", async () => ({
    name: clinic.name,
    phone: clinic.phone,
    email: clinic.email,
    address: clinic.address,
    website: clinic.website,
    timezone: clinic.timezone,
    hours: hoursLines(clinic.hours),
    providers: clinic.providers,
    services: clinic.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      price: formatPrice(s.price),
      providers: s.providers,
    })),
    insurance: clinic.insurance,
    languages: clinic.languages,
    booking: clinic.booking,
    calendar: booking.calendar.kind,
  }));

  app.get("/knowledge-base", async () => ({ entries: knowledgeBase.entries }));

  app.get("/knowledge-base/search", async (request, reply) => {
    const parsed = searchQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Add a question as "q", up to 300 characters.' });
    }
    const result = knowledgeBase.search(parsed.data.q);
    return {
      query: parsed.data.q,
      found: result.found,
      terms: result.terms,
      coverage: result.coverage,
      hits: result.hits.map(({ entry, score }) => ({ ...entry, score })),
      // Exactly what the assistant receives for this question.
      toolResult: toToolResult(result),
    };
  });

  app.get("/availability", async (request, reply) => {
    const parsed = availabilityQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: firstIssue(parsed.error) });
    const { serviceId, date, timeOfDay, providerId } = parsed.data;
    const availability = await booking.availability({
      serviceId,
      ...(date ? { date } : {}),
      ...(timeOfDay ? { timeOfDay } : {}),
      ...(providerId ? { providerId } : {}),
    });
    return { toolResult: toAvailabilityResult(availability) };
  });

  app.get("/schedule", async (request, reply) => {
    const parsed = scheduleQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: firstIssue(parsed.error) });
    const { serviceId, from, days, providerId } = parsed.data;
    return {
      calendar: booking.calendar.kind,
      ...(await booking.schedule(serviceId, from ?? booking.today(), days, providerId)),
    };
  });

  app.get("/appointments", async () => ({
    calendar: booking.calendar.kind,
    appointments: await booking.upcoming(),
  }));
};
