import Fastify, { type FastifyServerOptions } from "fastify";
import { BookingService } from "./booking/service.ts";
import type { CalendarClient } from "./calendar/types.ts";
import { CallRecorder, type CallStore } from "./callLog/index.ts";
import type { Config } from "./config.ts";
import type { ClinicData } from "./knowledgeBase/load.ts";
import { apiRoutes } from "./routes/api.ts";
import { healthRoutes } from "./routes/health.ts";
import { createTools } from "./tools/index.ts";
import { vapiRoutes } from "./vapi/routes.ts";
import type { ToolRegistry } from "./vapi/tools.ts";

export interface AppDeps {
  clinic: ClinicData;
  calendar: CalendarClient;
  callStore: CallStore;
  now?: () => Date;
  tools?: ToolRegistry;
}

function loggerOptions(config: Config): FastifyServerOptions["logger"] {
  if (config.env === "test") return false;

  if (config.env === "development") {
    return {
      level: config.logLevel,
      transport: {
        target: "pino-pretty",
        options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
    };
  }

  return { level: config.logLevel };
}

declare module "fastify" {
  interface FastifyInstance {
    callLog: CallRecorder;
  }
}

export async function buildApp(config: Config, deps: AppDeps) {
  const app = Fastify({
    logger: loggerOptions(config),
    bodyLimit: 5 * 1024 * 1024,
    trustProxy: true,
  });

  await app.register(healthRoutes);

  const booking = new BookingService(deps.clinic.clinic, deps.calendar, deps.now);
  const recorder = new CallRecorder(deps.callStore, app.log.child({ module: "callLog" }), deps.now);
  booking.onBooked((appointment) => recorder.booked(appointment));
  app.decorate("callLog", recorder);
  app.addHook("onClose", () => recorder.idle());

  await app.register(apiRoutes, {
    prefix: "/api",
    ...deps.clinic,
    booking,
    calls: deps.callStore,
  });

  await app.register(vapiRoutes, {
    prefix: "/vapi",
    secret: config.vapi.serverSecret,
    tools: deps.tools ?? createTools({ knowledgeBase: deps.clinic.knowledgeBase, booking }),
    recorder,
  });

  return app;
}
