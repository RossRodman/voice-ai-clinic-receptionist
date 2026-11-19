import { afterEach, describe, expect, it } from "vitest";
import { TEST_NOW, TEST_SECRET, testApp } from "../test/helpers.ts";
import { AttemptLimiter, FrontDeskAuth, readCookie, SESSION_COOKIE } from "./session.ts";

const PASSWORD = "brightside-front-desk";

let app: Awaited<ReturnType<typeof testApp>> | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function lockedApp() {
  app = await testApp({ config: { frontDeskPassword: PASSWORD } });

  return app;
}

function signIn(password: string, ip = "203.0.113.7") {
  return app!.inject({
    method: "POST",
    url: "/api/session",
    payload: { password },
    remoteAddress: ip,
  });
}

function sessionCookie(setCookie: string | string[] | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;

  return `${SESSION_COOKIE}=${readCookie(header, SESSION_COOKIE)}`;
}

describe("FrontDeskAuth", () => {
  it("accepts its own cookie until it expires", () => {
    let now = TEST_NOW;
    const auth = new FrontDeskAuth(PASSWORD, TEST_SECRET, () => now);
    const cookie = `${SESSION_COOKIE}=${auth.issue().value}`;

    expect(auth.isSignedIn(cookie)).toBe(true);
    expect(auth.isSignedIn(`theme=dark; ${cookie}`)).toBe(true);

    now = new Date(TEST_NOW.getTime() + 8 * 24 * 60 * 60 * 1000);
    expect(auth.isSignedIn(cookie)).toBe(false);
  });

  it("refuses a forged, edited or missing cookie", () => {
    const auth = new FrontDeskAuth(PASSWORD, TEST_SECRET, () => TEST_NOW);
    const [expires, signature] = auth.issue().value.split(".");
    const other = new FrontDeskAuth("another-password", TEST_SECRET, () => TEST_NOW);

    expect(auth.isSignedIn(undefined)).toBe(false);
    expect(auth.isSignedIn(`${SESSION_COOKIE}=${other.issue().value}`)).toBe(false);
    expect(auth.isSignedIn(`${SESSION_COOKIE}=${Number(expires) + 1}.${signature}`)).toBe(false);
    expect(auth.isSignedIn(`${SESSION_COOKIE}=${expires}.`)).toBe(false);
    expect(auth.isSignedIn(`${SESSION_COOKIE}=garbage`)).toBe(false);
  });

  it("lets everyone in when there is no password", () => {
    const auth = new FrontDeskAuth(undefined, TEST_SECRET);

    expect(auth.required).toBe(false);
    expect(auth.isSignedIn(undefined)).toBe(true);
    expect(auth.checkPassword("")).toBe(false);
  });
});

describe("AttemptLimiter", () => {
  it("blocks an address after too many failures, until the window passes", () => {
    let now = TEST_NOW;
    const limiter = new AttemptLimiter(2, 60_000, () => now);

    limiter.fail("a");
    expect(limiter.retryAfter("a")).toBe(0);

    limiter.fail("a");
    expect(limiter.retryAfter("a")).toBe(60);
    expect(limiter.retryAfter("b")).toBe(0);

    now = new Date(TEST_NOW.getTime() + 61_000);
    expect(limiter.retryAfter("a")).toBe(0);
  });
});

describe("Front Desk sign-in", () => {
  it("leaves /api open when FRONT_DESK_PASSWORD is not set", async () => {
    app = await testApp();

    expect((await app.inject("/api/session")).json()).toEqual({ required: false, signedIn: true });
    expect((await app.inject("/api/clinic")).statusCode).toBe(200);
  });

  it("closes /api until the password is given", async () => {
    await lockedApp();

    expect((await app!.inject("/api/session")).json()).toEqual({ required: true, signedIn: false });

    const res = await app!.inject("/api/calls");
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "Sign in to Front Desk first." });

    expect((await app!.inject("/health")).statusCode).toBe(200);
  });

  it("signs in with the password and sets an HttpOnly cookie", async () => {
    await lockedApp();
    const res = await signIn(PASSWORD);

    expect(res.statusCode).toBe(204);
    expect(res.headers["set-cookie"]).toMatch(
      /^front_desk_session=\d+\.[\w-]+; Path=\/; Max-Age=604800; HttpOnly; SameSite=Strict$/,
    );

    const cookie = sessionCookie(res.headers["set-cookie"]);
    const session = await app!.inject({ url: "/api/session", headers: { cookie } });
    expect(session.json()).toEqual({ required: true, signedIn: true });
    expect((await app!.inject({ url: "/api/clinic", headers: { cookie } })).statusCode).toBe(200);
  });

  it("marks the cookie Secure behind https", async () => {
    await lockedApp();
    const res = await app!.inject({
      method: "POST",
      url: "/api/session",
      payload: { password: PASSWORD },
      headers: { "x-forwarded-proto": "https" },
    });

    expect(res.headers["set-cookie"]).toMatch(/; Secure$/);
  });

  it("refuses a wrong password, and slows down guessing", async () => {
    await lockedApp();

    for (let i = 0; i < 5; i++) {
      const res = await signIn("wrong-password");
      expect(res.statusCode).toBe(401);
      expect(res.json()).toEqual({ error: "That password isn't right." });
      expect(res.headers["set-cookie"]).toBeUndefined();
    }

    const blocked = await signIn(PASSWORD);
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);

    expect((await signIn(PASSWORD, "198.51.100.4")).statusCode).toBe(204);
  });

  it("signs out by clearing the cookie", async () => {
    await lockedApp();
    const res = await app!.inject({ method: "DELETE", url: "/api/session" });

    expect(res.statusCode).toBe(204);
    expect(res.headers["set-cookie"]).toMatch(/^front_desk_session=; Path=\/; Max-Age=0;/);
  });

  it("does not put the Vapi webhook behind the password", async () => {
    await lockedApp();
    const res = await app!.inject({
      method: "POST",
      url: "/vapi/webhook",
      headers: { "x-vapi-secret": TEST_SECRET },
      payload: { message: { type: "status-update", status: "ringing", call: { id: "call_1" } } },
    });

    expect(res.statusCode).not.toBe(401);
  });
});
