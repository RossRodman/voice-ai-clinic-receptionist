import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "front_desk_session";

export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const digest = (value: string) => createHash("sha256").update(value).digest();

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const [key, ...value] = part.trim().split("=");

    if (key === name) {
      return value.join("=");
    }
  }

  return undefined;
}

export interface SessionCookie {
  value: string;
  maxAge: number;
}

/**
 * Front Desk has one password, set in FRONT_DESK_PASSWORD. Signing in sets a cookie with its
 * expiry, signed with a key derived from the password: changing the password signs everyone out.
 */
export class FrontDeskAuth {
  readonly required: boolean;
  private readonly password: Buffer | undefined;
  private readonly key: Buffer | undefined;
  private readonly now: () => Date;

  constructor(password: string | undefined, secret: string, now: () => Date = () => new Date()) {
    this.required = password !== undefined;
    this.now = now;

    if (password !== undefined) {
      this.password = digest(password);
      this.key = digest(`front-desk-session:${secret}:${password}`);
    }
  }

  checkPassword(password: string): boolean {
    if (!this.password) {
      return false;
    }

    return timingSafeEqual(digest(password), this.password);
  }

  issue(): SessionCookie {
    const expires = this.now().getTime() + SESSION_MAX_AGE_SECONDS * 1000;

    return { value: `${expires}.${this.sign(String(expires))}`, maxAge: SESSION_MAX_AGE_SECONDS };
  }

  isSignedIn(cookieHeader: string | undefined): boolean {
    if (!this.required) {
      return true;
    }

    const [expires, signature] = readCookie(cookieHeader, SESSION_COOKIE)?.split(".") ?? [];

    if (!expires || !signature || !/^\d+$/.test(expires)) {
      return false;
    }

    if (Number(expires) <= this.now().getTime()) {
      return false;
    }

    const expected = Buffer.from(this.sign(expires));
    const provided = Buffer.from(signature);

    return provided.length === expected.length && timingSafeEqual(provided, expected);
  }

  private sign(value: string): string {
    return createHmac("sha256", this.key!).update(value).digest("base64url");
  }
}

/** Counts failed sign-ins per address: after `max` in `windowMs`, the next ones are refused. */
export class AttemptLimiter {
  private readonly failures = new Map<string, number[]>();
  private readonly max: number;
  private readonly windowMs: number;
  private readonly now: () => Date;

  constructor(max = 5, windowMs = 15 * 60_000, now: () => Date = () => new Date()) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
  }

  /** Seconds until the address may try again, or 0. */
  retryAfter(address: string): number {
    const recent = this.recent(address);

    if (recent.length < this.max) {
      return 0;
    }

    return Math.ceil((recent[0]! + this.windowMs - this.now().getTime()) / 1000);
  }

  fail(address: string) {
    this.failures.set(address, [...this.recent(address), this.now().getTime()]);
  }

  reset(address: string) {
    this.failures.delete(address);
  }

  private recent(address: string): number[] {
    const since = this.now().getTime() - this.windowMs;
    const recent = (this.failures.get(address) ?? []).filter((t) => t > since);

    if (recent.length === 0) {
      this.failures.delete(address);
    } else {
      this.failures.set(address, recent);
    }

    return recent;
  }
}
