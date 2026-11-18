import { createPrivateKey, type KeyObject, sign } from "node:crypto";
import { z } from "zod";
import { CalendarError } from "./types.ts";

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const serviceAccountSchema = z.looseObject({
  client_email: z.email(),
  private_key: z.string().includes("PRIVATE KEY"),
  token_uri: z.url().default("https://oauth2.googleapis.com/token"),
});

export type ServiceAccount = z.infer<typeof serviceAccountSchema>;

export function parseServiceAccount(value: string): ServiceAccount {
  const trimmed = value.trim();
  const json = trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf8");
  let raw: unknown;

  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("is neither the key's JSON nor the JSON base64-encoded");
  }

  const parsed = serviceAccountSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `is not a service account key (${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")})`,
    );
  }

  return parsed.data;
}

const base64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

export function signJwt(account: ServiceAccount, key: KeyObject, nowSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: CALENDAR_SCOPE,
      aud: account.token_uri,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );

  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${claims}`), key);
  return `${header}.${claims}.${base64url(signature)}`;
}

const tokenResponse = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

export class ServiceAccountAuth {
  private readonly account: ServiceAccount;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly key: KeyObject;
  private cached?: { token: string; expiresAt: number };
  private pending?: Promise<string>;

  constructor(
    account: ServiceAccount,
    fetchFn: typeof fetch = fetch,
    now: () => number = Date.now,
  ) {
    this.account = account;
    this.fetchFn = fetchFn;
    this.now = now;
    this.key = createPrivateKey(account.private_key);
  }

  async token(): Promise<string> {
    if (this.cached && this.cached.expiresAt > this.now()) {
      return this.cached.token;
    }

    this.pending ??= this.fetchToken().finally(() => {
      this.pending = undefined;
    });

    return this.pending;
  }

  private async fetchToken(): Promise<string> {
    const assertion = signJwt(this.account, this.key, Math.floor(this.now() / 1000));
    const response = await this.fetchFn(this.account.token_uri, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(5000),
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const detail =
        body && typeof body === "object" && "error_description" in body
          ? String(body.error_description)
          : response.statusText;
      throw new CalendarError(`Google auth failed: ${detail}`, response.status);
    }

    const { access_token, expires_in } = tokenResponse.parse(body);
    // Refresh a minute early, so a token never expires mid-request.
    this.cached = {
      token: access_token,
      expiresAt: this.now() + (expires_in - 60) * 1000,
    };

    return access_token;
  }
}
