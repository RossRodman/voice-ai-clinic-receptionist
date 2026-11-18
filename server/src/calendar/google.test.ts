import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { GoogleCalendar } from "./google.ts";
import {
  CALENDAR_SCOPE,
  parseServiceAccount,
  ServiceAccountAuth,
  signJwt,
  type ServiceAccount,
} from "./googleAuth.ts";
import { CalendarError } from "./types.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const account: ServiceAccount = {
  client_email: "receptionist@clinic-demo.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  token_uri: "https://oauth2.googleapis.com/token",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("parseServiceAccount", () => {
  it("reads the key as JSON or base64", () => {
    const raw = JSON.stringify({ type: "service_account", ...account });
    expect(parseServiceAccount(raw).client_email).toBe(account.client_email);
    expect(parseServiceAccount(Buffer.from(raw).toString("base64")).client_email).toBe(
      account.client_email,
    );
  });

  it("explains what is wrong", () => {
    expect(() => parseServiceAccount("not a key")).toThrow(/neither the key's JSON/);
    expect(() => parseServiceAccount('{"client_email":"x@y.z"}')).toThrow(/private_key/);
  });
});

describe("ServiceAccountAuth", () => {
  it("signs a JWT Google can verify", () => {
    const jwt = signJwt(account, privateKey, 1_800_000_000);
    const [header, claims, signature] = jwt.split(".") as [string, string, string];
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toEqual({
      iss: account.client_email,
      scope: CALENDAR_SCOPE,
      aud: account.token_uri,
      iat: 1_800_000_000,
      exp: 1_800_003_600,
    });
    expect(
      verify(
        "RSA-SHA256",
        Buffer.from(`${header}.${claims}`),
        publicKey,
        Buffer.from(signature, "base64url"),
      ),
    ).toBe(true);
  });

  it("caches the token until a minute before it expires, with one request at a time", async () => {
    let now = 1_800_000_000_000;
    let issued = 0;
    const fetchFn = vi.fn<typeof fetch>(async () =>
      json({ access_token: `tok_${++issued}`, expires_in: 3600 }),
    );
    const auth = new ServiceAccountAuth(account, fetchFn, () => now);

    expect(await Promise.all([auth.token(), auth.token()])).toEqual(["tok_1", "tok_1"]);
    now += 3500_000;
    expect(await auth.token()).toBe("tok_1");
    now += 60_000;
    expect(await auth.token()).toBe("tok_2");
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const body = fetchFn.mock.calls[0]![1]!.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    expect(body.get("assertion")?.split(".")).toHaveLength(3);
  });

  it("reports Google's reason when auth fails", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () =>
      json({ error: "invalid_grant", error_description: "Invalid JWT Signature." }, 400),
    );
    await expect(new ServiceAccountAuth(account, fetchFn).token()).rejects.toThrow(
      "Google auth failed: Invalid JWT Signature.",
    );
  });
});

describe("GoogleCalendar", () => {
  const setup = (responses: Response[]) => {
    const fetchFn = vi.fn<typeof fetch>(async () => responses.shift()!);
    const calendar = new GoogleCalendar({
      calendarId: "clinic@group.calendar.google.com",
      timeZone: "America/Chicago",
      providerIds: ["dr-carter", "hannah-lee"],
      auth: { token: async () => "tok" },
      fetchFn,
    });
    return { calendar, fetchFn };
  };

  const from = new Date("2026-11-18T06:00:00Z");
  const to = new Date("2026-11-19T06:00:00Z");

  it("lists events across pages and reads whose time they take", async () => {
    const { calendar, fetchFn } = setup([
      json({
        items: [
          {
            id: "a",
            summary: "Checkup and cleaning: Maria Lopez",
            start: { dateTime: "2026-11-18T09:00:00-06:00" },
            end: { dateTime: "2026-11-18T10:00:00-06:00" },
            extendedProperties: {
              private: {
                bookedBy: "ai-receptionist",
                serviceId: "checkup-cleaning",
                providerId: "hannah-lee",
                patientName: "Maria Lopez",
                patientPhone: "+15551234567",
                newPatient: "true",
              },
            },
          },
          {
            id: "b",
            summary: "Lunch #dr-carter",
            start: { dateTime: "2026-11-18T12:00:00-06:00" },
            end: { dateTime: "2026-11-18T13:00:00-06:00" },
          },
          {
            id: "c",
            summary: "Reminder: order supplies",
            transparency: "transparent",
            start: { dateTime: "2026-11-18T08:00:00-06:00" },
            end: { dateTime: "2026-11-18T08:30:00-06:00" },
          },
        ],
        nextPageToken: "p2",
      }),
      json({
        items: [
          {
            id: "d",
            summary: "Thanksgiving",
            start: { date: "2026-11-18" },
            end: { date: "2026-11-19" },
          },
          { id: "e", status: "cancelled", start: {}, end: {} },
        ],
      }),
    ]);

    const events = await calendar.listEvents(from, to);

    expect(events).toEqual([
      {
        id: "a",
        summary: "Checkup and cleaning: Maria Lopez",
        start: new Date("2026-11-18T15:00:00Z"),
        end: new Date("2026-11-18T16:00:00Z"),
        providerId: "hannah-lee",
        appointment: {
          serviceId: "checkup-cleaning",
          providerId: "hannah-lee",
          patientName: "Maria Lopez",
          patientPhone: "+15551234567",
          newPatient: true,
        },
      },
      expect.objectContaining({ id: "b", providerId: "dr-carter" }),
      {
        id: "d",
        summary: "Thanksgiving",
        start: new Date("2026-11-18T06:00:00Z"),
        end: new Date("2026-11-19T06:00:00Z"),
      },
    ]);

    const [first, second] = fetchFn.mock.calls.map(([url]) => new URL(String(url)));
    expect(first!.pathname).toBe(
      "/calendar/v3/calendars/clinic%40group.calendar.google.com/events",
    );
    expect(Object.fromEntries(first!.searchParams)).toEqual({
      timeMin: "2026-11-18T06:00:00.000Z",
      timeMax: "2026-11-19T06:00:00.000Z",
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });
    expect(second!.searchParams.get("pageToken")).toBe("p2");
    expect(fetchFn.mock.calls[0]![1]!.headers).toMatchObject({ authorization: "Bearer tok" });
  });

  it("creates the event in the clinic's time zone with the booking details", async () => {
    const { calendar, fetchFn } = setup([
      json({
        id: "new1",
        summary: "Crown: Tom Reed",
        start: { dateTime: "2026-11-18T09:00:00-06:00" },
        end: { dateTime: "2026-11-18T10:30:00-06:00" },
        extendedProperties: {
          private: {
            bookedBy: "ai-receptionist",
            serviceId: "crown",
            providerId: "dr-carter",
            patientName: "Tom Reed",
            patientPhone: "5550000000",
          },
        },
      }),
    ]);

    const event = await calendar.createEvent({
      summary: "Crown: Tom Reed",
      description: "Patient: Tom Reed",
      start: new Date("2026-11-18T15:00:00Z"),
      end: new Date("2026-11-18T16:30:00Z"),
      appointment: {
        serviceId: "crown",
        providerId: "dr-carter",
        patientName: "Tom Reed",
        patientPhone: "5550000000",
        callId: "call_9",
      },
    });

    expect(event).toMatchObject({ id: "new1", providerId: "dr-carter" });
    const [, init] = fetchFn.mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      summary: "Crown: Tom Reed",
      description: "Patient: Tom Reed",
      start: { dateTime: "2026-11-18T09:00:00-06:00", timeZone: "America/Chicago" },
      end: { dateTime: "2026-11-18T10:30:00-06:00", timeZone: "America/Chicago" },
      extendedProperties: {
        private: {
          bookedBy: "ai-receptionist",
          serviceId: "crown",
          providerId: "dr-carter",
          patientName: "Tom Reed",
          patientPhone: "5550000000",
          callId: "call_9",
        },
      },
    });
  });

  it("turns API errors into a CalendarError with Google's message", async () => {
    const { calendar } = setup([
      json(
        { error: { code: 403, message: "You need to have writer access to this calendar." } },
        403,
      ),
    ]);
    const error = await calendar.listEvents(from, to).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(CalendarError);
    expect(error).toMatchObject({
      status: 403,
      message: "Google Calendar 403: You need to have writer access to this calendar.",
    });
  });

  it("reports a network failure", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const calendar = new GoogleCalendar({
      calendarId: "c",
      timeZone: "America/Chicago",
      providerIds: [],
      auth: { token: async () => "tok" },
      fetchFn,
    });
    await expect(calendar.listEvents(from, to)).rejects.toThrow(
      "Google Calendar is unreachable: fetch failed",
    );
  });
});
