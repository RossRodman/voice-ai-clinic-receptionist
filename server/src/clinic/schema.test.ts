import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA_DIR } from "../knowledgeBase/load.ts";
import { clinicSchema } from "./schema.ts";

const raw = JSON.parse(readFileSync(`${DEFAULT_DATA_DIR}/clinic.json`, "utf8"));

const messages = (value: unknown) => {
  const result = clinicSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("clinicSchema", () => {
  it("accepts the clinic's data file", () => {
    expect(messages(raw)).toEqual([]);
  });

  it("rejects a service done by an unknown provider", () => {
    const services = structuredClone(raw.services);
    services[0].providers = ["dr-nobody"];
    expect(messages({ ...raw, services })).toEqual([
      'services.0.providers.0: unknown provider "dr-nobody"',
    ]);
  });

  it("rejects duplicate service ids", () => {
    expect(messages({ ...raw, services: [raw.services[0], raw.services[0]] })).toEqual([
      `services.1.id: duplicate "${raw.services[0].id}"`,
    ]);
  });

  it("rejects bad opening hours and time zones", () => {
    expect(
      messages({
        ...raw,
        timezone: "Mars/Olympus",
        hours: { ...raw.hours, mon: [["18:00", "08:00"]] },
      }),
    ).toEqual(["timezone: is not an IANA time zone", "hours.mon.0: opens after it closes"]);
    expect(messages({ ...raw, hours: { ...raw.hours, tue: [["8:00", "18:00"]] } })).toContain(
      "hours.tue.0.0: must be HH:MM, 24-hour",
    );
  });
});
