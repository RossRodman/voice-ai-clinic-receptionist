import type { FastifyPluginAsync } from "fastify";
import type { CallRecorder } from "../callLog/recorder.ts";
import { hasValidSecret } from "./auth.ts";
import {
  endOfCallReportSchema,
  serverMessageSchema,
  statusUpdateMessageSchema,
  toolCallsMessageSchema,
} from "./schemas.ts";
import { runToolCalls, type ToolRegistry } from "./tools.ts";

export interface VapiRoutesOptions {
  secret: string;
  tools: ToolRegistry;
  recorder: CallRecorder;
}

export const vapiRoutes: FastifyPluginAsync<VapiRoutesOptions> = async (
  app,
  { secret, tools, recorder },
) => {
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

        const { call, toolCallList } = parsed.data;

        if (call) {
          recorder.callSeen(call);
        }

        const runs = await runToolCalls(toolCallList, tools, { ...(call ? { call } : {}), log });

        if (call) {
          recorder.toolCallsDone(call.id, runs);
        }

        return { results: runs.map((run) => run.response) };
      }

      case "status-update": {
        const parsed = statusUpdateMessageSchema.safeParse(message);

        if (parsed.success && parsed.data.status === "in-progress") {
          recorder.callSeen(parsed.data.call);
        }

        log.debug({ status: parsed.data?.status }, "call status");

        return {};
      }

      case "end-of-call-report": {
        const parsed = endOfCallReportSchema.safeParse(message);

        if (!parsed.success) {
          log.warn({ issues: parsed.error.issues }, "malformed end-of-call report");

          return reply.code(400).send({ error: "Malformed end-of-call report" });
        }

        try {
          const saved = await recorder.endOfCall(parsed.data);
          log.info(
            { outcome: saved?.outcome, durationSeconds: saved?.durationSeconds },
            "call logged",
          );

          return {};
        } catch {
          return reply.code(500).send({ error: "Could not save the call" });
        }
      }

      default:
        log.debug("vapi message acknowledged");

        return {};
    }
  });
};
