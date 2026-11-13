import type { FastifyPluginAsync } from "fastify";
import { hasValidSecret } from "./auth.ts";
import { serverMessageSchema, toolCallsMessageSchema } from "./schemas.ts";
import { runToolCalls, type ToolRegistry } from "./tools.ts";

export interface VapiRoutesOptions {
  secret: string;
  tools: ToolRegistry;
}

export const vapiRoutes: FastifyPluginAsync<VapiRoutesOptions> = async (app, { secret, tools }) => {
  app.addHook("onRequest", async (request, reply) => {
    if (!hasValidSecret(request.headers, secret)) {
      request.log.warn("vapi webhook: missing or wrong secret");
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });

  app.post("/webhook", async (request, reply) => {
    const envelope = serverMessageSchema.safeParse(request.body);
    if (!envelope.success) {
      return reply.code(400).send({ error: "Not a Vapi server message" });
    }

    const { message } = envelope.data;
    const log = request.log.child({ vapiMessage: message.type, callId: message.call?.id });

    switch (message.type) {
      case "tool-calls": {
        const parsed = toolCallsMessageSchema.safeParse(message);

        if (!parsed.success) {
          log.warn({ issues: parsed.error.issues }, "malformed tool-calls message");
          return reply.code(400).send({ error: "Malformed tool-calls message" });
        }

        const results = await runToolCalls(parsed.data.toolCallList, tools, {
          call: parsed.data.call,
          log,
        });

        return { results };
      }

      default:
        log.debug("vapi message acknowledged");
        return {};
    }
  });
};
