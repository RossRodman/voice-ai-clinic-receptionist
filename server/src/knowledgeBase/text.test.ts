import { describe, expect, it } from "vitest";
import { stem, tokenize } from "./text.ts";

describe("stem", () => {
  it.each([
    ["cleaning", "clean"],
    ["cavities", "cavity"],
    ["canals", "canal"],
    ["knocked", "knock"],
    ["glass", "glass"],
    ["bus", "bus"],
    ["is", "is"],
  ])("%s → %s", (word, expected) => {
    expect(stem(word)).toBe(expected);
  });
});

describe("tokenize", () => {
  it("drops stop words and numbers, and maps synonyms", () => {
    expect(tokenize("How much does a cleaning cost?")).toEqual(["price", "cleaning", "price"]);
    expect(tokenize("I'll be 20 minutes late")).toEqual(["minute", "late"]);
  });

  it("reads callers' words the way the entries are written", () => {
    expect(tokenize("my kids' teeth hurt")).toEqual(["child", "tooth", "pain"]);
    expect(tokenize("X-rays")).toEqual(["xray"]);
    expect(tokenize("Do you speak Español?")).toEqual(["speak", "spanish"]);
  });

  it("returns nothing for small talk", () => {
    expect(tokenize("Hi, okay, thanks!")).toEqual([]);
  });
});
