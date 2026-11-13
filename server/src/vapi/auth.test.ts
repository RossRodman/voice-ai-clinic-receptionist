import { describe, expect, it } from "vitest";
import { hasValidSecret } from "./auth.ts";

const secret = "test-secret-0123456789abcdef";

describe("hasValidSecret", () => {
  it("accepts the x-vapi-secret header", () => {
    expect(hasValidSecret({ "x-vapi-secret": secret }, secret)).toBe(true);
  });

  it("accepts a Bearer token", () => {
    expect(hasValidSecret({ authorization: `Bearer ${secret}` }, secret)).toBe(true);
    expect(hasValidSecret({ authorization: `bearer ${secret}` }, secret)).toBe(true);
  });

  it("rejects a wrong or missing secret", () => {
    expect(hasValidSecret({ "x-vapi-secret": "wrong" }, secret)).toBe(false);
    expect(hasValidSecret({ "x-vapi-secret": `${secret}x` }, secret)).toBe(false);
    expect(hasValidSecret({ authorization: `Basic ${secret}` }, secret)).toBe(false);
    expect(hasValidSecret({}, secret)).toBe(false);
  });

  it("prefers x-vapi-secret over the Authorization header", () => {
    expect(
      hasValidSecret({ "x-vapi-secret": "wrong", authorization: `Bearer ${secret}` }, secret),
    ).toBe(false);
  });
});
