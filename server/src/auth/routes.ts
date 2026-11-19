import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AttemptLimiter, type FrontDeskAuth, SESSION_COOKIE } from "./session.ts";

const signInBody = z.object({ password: z.string().min(1).max(200) });

function setCookie(request: FastifyRequest, reply: FastifyReply, value: string, maxAge: number) {
  const secure = request.protocol === "https" ? "; Secure" : "";

  reply.header(
    "set-cookie",
    `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`,
  );
}

export interface SessionRoutesOptions {
  auth: FrontDeskAuth;
  limiter?: AttemptLimiter;
}

export const sessionRoutes: FastifyPluginAsync<SessionRoutesOptions> = async (
  app,
  { auth, limiter = new AttemptLimiter() },
) => {
  app.get("/session", async (request) => ({
    required: auth.required,
    signedIn: auth.isSignedIn(request.headers.cookie),
  }));

  app.post("/session", async (request, reply) => {
    if (!auth.required) {
      return reply.code(204).send();
    }

    const retryAfter = limiter.retryAfter(request.ip);

    if (retryAfter > 0) {
      return reply
        .code(429)
        .header("retry-after", String(retryAfter))
        .send({ error: "Too many wrong passwords. Try again in a few minutes." });
    }

    const parsed = signInBody.safeParse(request.body);

    if (!parsed.success || !auth.checkPassword(parsed.data.password)) {
      limiter.fail(request.ip);
      request.log.warn({ ip: request.ip }, "front desk sign-in failed");

      return reply.code(401).send({ error: "That password isn't right." });
    }

    limiter.reset(request.ip);
    const session = auth.issue();
    setCookie(request, reply, session.value, session.maxAge);

    return reply.code(204).send();
  });

  app.delete("/session", async (request, reply) => {
    setCookie(request, reply, "", 0);

    return reply.code(204).send();
  });
};
