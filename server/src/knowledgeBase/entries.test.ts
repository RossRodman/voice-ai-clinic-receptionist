import { describe, expect, it } from "vitest";
import { testClinic } from "../test/helpers.ts";
import { clinicEntries, parseFaq, slugify } from "./entries.ts";

describe("parseFaq", () => {
  it("makes one entry per ## heading, with optional keywords", () => {
    const entries = parseFaq(`# Title, ignored

Intro, ignored.

## Parking and getting here

keywords: park, car , bus

Free parking
behind the building.

## Languages

English and Spanish.
`);
    expect(entries).toEqual([
      {
        id: "faq:parking-and-getting-here",
        title: "Parking and getting here",
        content: "Free parking behind the building.",
        keywords: ["park", "car", "bus"],
        source: "faq",
      },
      {
        id: "faq:languages",
        title: "Languages",
        content: "English and Spanish.",
        keywords: [],
        source: "faq",
      },
    ]);
  });

  it("only reads keywords right under the heading", () => {
    const [entry] = parseFaq("## Notes\n\nSome text.\nkeywords: not, these\n");
    expect(entry?.keywords).toEqual([]);
    expect(entry?.content).toBe("Some text. keywords: not, these");
  });

  it("rejects an entry without text", () => {
    expect(() => parseFaq("## Empty\n\nkeywords: a\n")).toThrow(/"Empty" is empty/);
  });
});

describe("slugify", () => {
  it("makes ids from titles", () => {
    expect(slugify("No insurance: membership plan")).toBe("no-insurance-membership-plan");
    expect(slugify("Español & más")).toBe("espanol-mas");
  });
});

describe("clinicEntries", () => {
  it("writes the hours the way they are said", async () => {
    const { clinic } = await testClinic();
    const hours = clinicEntries(clinic).find((e) => e.id === "hours");
    expect(hours?.content).toBe(
      "Brightside Dental is open Monday to Thursday 8 AM to 6 PM; Friday 8 AM to 3 PM; Saturday 9 AM to 1 PM; closed on Sunday. All times are local time.",
    );
  });

  it("makes a bookable entry for each service, with length, price and who does it", async () => {
    const { clinic } = await testClinic();
    const entries = clinicEntries(clinic);
    const rootCanal = entries.find((e) => e.id === "service:root-canal");

    expect(entries.filter((e) => e.serviceId)).toHaveLength(clinic.services.length);
    expect(rootCanal?.serviceId).toBe("root-canal");
    expect(rootCanal?.content).toContain("It takes about 90 minutes");
    expect(rootCanal?.content).toContain("from $950 (front teeth; molars from $1,200)");
    expect(rootCanal?.content).toContain("With Dr. James Okafor.");
  });

  it("lists the insurance plans", async () => {
    const { clinic } = await testClinic();
    const insurance = clinicEntries(clinic).find((e) => e.id === "insurance");
    expect(insurance?.content).toContain("in network with Delta Dental PPO, MetLife");
    expect(insurance?.content).toContain("We don't accept Medicaid or dental HMO plans.");
  });
});
