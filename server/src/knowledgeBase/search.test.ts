import { beforeAll, describe, expect, it } from "vitest";
import { testClinic } from "../test/helpers.ts";
import type { KnowledgeEntry } from "./entries.ts";
import { KnowledgeBase } from "./search.ts";

let kb: KnowledgeBase;
beforeAll(async () => {
  kb = (await testClinic()).knowledgeBase;
});

/**
 * Questions the way callers ask them, against the real Brightside Dental data.
 * The expected entry must come first: it is the one the assistant reads out.
 */
const ANSWERED: [question: string, expected: string][] = [
  ["How much is a cleaning?", "service:checkup-cleaning"],
  ["Do you take Delta Dental?", "insurance"],
  ["Do you accept Medicaid?", "insurance"],
  ["Are you open on Saturday?", "hours"],
  ["What time do you close on Friday?", "hours"],
  ["Where can I park?", "faq:parking-and-getting-here"],
  ["What's your address?", "contact"],
  ["My tooth hurts really bad", "service:emergency"],
  ["Do you see kids?", "service:kids-checkup"],
  ["Can I pay with my HSA card?", "faq:payment-and-financing"],
  ["Can I get a payment plan?", "faq:payment-and-financing"],
  ["I need to cancel my appointment", "faq:cancelling-or-rescheduling"],
  ["I'll be 20 minutes late", "faq:running-late"],
  ["Do you speak Spanish?", "faq:languages"],
  ["Who does root canals?", "service:root-canal"],
  ["How much are braces?", "service:aligner-consultation"],
  ["What should I bring to my first visit?", "faq:first-visit-what-to-bring"],
  ["Is laughing gas available?", "faq:nervous-patients-and-sedation"],
  ["I'm really scared of the dentist", "faq:nervous-patients-and-sedation"],
  ["Do you do teeth whitening?", "service:whitening"],
  ["My son knocked out his tooth playing soccer", "faq:knocked-out-tooth"],
  ["Can you prescribe antibiotics?", "faq:medical-questions-and-prescriptions"],
  ["Are you open on Christmas?", "faq:holidays"],
  ["Is it safe to get x-rays while pregnant?", "faq:x-rays-and-safety"],
  ["How long does a filling take?", "service:filling"],
];

/** Not about the clinic: the assistant must say it doesn't know, not read out a near miss. */
const NOT_ANSWERED = [
  "Do you do knee surgery?",
  "What's the weather like tomorrow?",
  "Can you book me a table for two?",
  "Who won the game last night?",
  "Do you sell car insurance?",
  "I want to order a pizza",
  "Can you fix my glasses?",
  "Do you offer botox?",
  "hello",
  "",
];

describe("KnowledgeBase.search on the clinic's data", () => {
  it.each(ANSWERED)("%s → %s", (question, expected) => {
    const result = kb.search(question);
    expect(result.found).toBe(true);
    expect(result.hits[0]?.entry.id).toBe(expected);
  });

  it.each(NOT_ANSWERED)("%j → not found", (question) => {
    const result = kb.search(question);
    expect(result.found).toBe(false);
    expect(result.hits).toEqual([]);
  });

  it("also returns the membership plan to someone without insurance", () => {
    const ids = kb.search("I don't have insurance").hits.map((h) => h.entry.id);
    expect(ids).toContain("faq:no-insurance-membership-plan");
  });

  it("returns at most `limit` hits, best first", () => {
    const { hits } = kb.search("price of a cleaning", { limit: 2 });
    expect(hits).toHaveLength(2);
    expect(hits[0]!.score).toBeGreaterThanOrEqual(hits[1]!.score);
  });

  it("gives the same answer every time", () => {
    expect(kb.search("Do you see kids?")).toEqual(kb.search("Do you see kids?"));
  });
});

describe("KnowledgeBase", () => {
  const entry = (id: string, title: string, content: string): KnowledgeEntry => ({
    id,
    title,
    content,
    keywords: [],
    source: "faq",
  });

  it("rejects duplicate ids", () => {
    expect(() => new KnowledgeBase([entry("a", "A", "x"), entry("a", "B", "y")])).toThrow(
      /Duplicate/,
    );
  });

  it("ranks a title match above a passing mention", () => {
    const kb = new KnowledgeBase([
      entry("parking", "Parking", "Free lot behind the building."),
      entry("contact", "Contact", "Call us. Street parking is limited."),
      entry("hours", "Hours", "Open every weekday."),
    ]);
    expect(kb.search("parking").hits.map((h) => h.entry.id)).toEqual(["parking", "contact"]);
  });

  it("doesn't answer when the question's main word isn't in the entries", () => {
    const kb = new KnowledgeBase([
      entry("sedation", "Sedation", "Nitrous oxide for anxious patients."),
      entry("hours", "Hours", "Open every weekday."),
      entry("contact", "Contact", "Call us."),
    ]);
    expect(kb.search("anxious about needles").found).toBe(false);
  });

  it("finds an entry by its keywords", () => {
    const kb = new KnowledgeBase([
      { ...entry("sedation", "Sedation", "Nitrous oxide is available."), keywords: ["scared"] },
      entry("hours", "Hours", "Open every weekday."),
      entry("contact", "Contact", "Call us."),
    ]);
    expect(kb.search("I'm afraid").hits[0]?.entry.id).toBe("sedation");
  });
});
