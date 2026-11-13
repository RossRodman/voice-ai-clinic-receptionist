import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

const digest = (value: string) => createHash("sha256").update(value).digest();

export function hasValidSecret(headers: IncomingHttpHeaders, secret: string): boolean {
  const header = headers["x-vapi-secret"];
  const bearer = headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const provided = (Array.isArray(header) ? header[0] : header) ?? bearer;

  if (!provided) return false;

  return timingSafeEqual(digest(provided), digest(secret));
}
