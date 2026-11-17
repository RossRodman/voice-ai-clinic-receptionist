import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { formatPrice, hoursLines } from "../clinic/format.ts";
import type { ClinicData } from "../knowledgeBase/load.ts";
import { toToolResult } from "../tools/searchKnowledgeBase.ts";

const searchQuery = z.object({ q: z.string().trim().min(1).max(300) });

export const apiRoutes: FastifyPluginAsync<ClinicData> = async (app, { clinic, knowledgeBase }) => {
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
};
