import Fastify, { type FastifyServerOptions } from "fastify";
import type { Config } from "./config.ts";
import { healthRoutes } from "./routes/health.ts";
import { vapiRoutes } from "./vapi/routes.ts";
import type { ToolRegistry } from "./vapi/tools.ts";

export interface AppDeps {
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

export async function buildApp(config: Config, deps: AppDeps = {}) {
  const app = Fastify({
    logger: loggerOptions(config),
    bodyLimit: 5 * 1024 * 1024,
    trustProxy: true,
  });

  await app.register(healthRoutes);

  await app.register(vapiRoutes, {
    prefix: "/vapi",
    secret: config.vapi.serverSecret,
    tools: deps.tools ?? {},
  });

  return app;
}
