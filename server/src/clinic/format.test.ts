import { describe, expect, it } from "vitest";
import { formatPrice, formatTime, hoursLines, joinList } from "./format.ts";
import type { Clinic } from "./schema.ts";

describe("formatTime", () => {
  it.each([
    ["08:00", "8 AM"],
    ["00:00", "12 AM"],
    ["12:00", "noon"],
    ["12:30", "12:30 PM"],
    ["18:00", "6 PM"],
    ["09:05", "9:05 AM"],
  ])("%s → %s", (time, expected) => {
    expect(formatTime(time)).toBe(expected);
  });
});

describe("formatPrice", () => {
  it("says prices the way they are read out", () => {
    expect(formatPrice({ amount: 120 })).toBe("$120");
    expect(formatPrice({ amount: 0 })).toBe("free");
    expect(formatPrice({ amount: 1150, from: true })).toBe("from $1,150");
    expect(formatPrice({ amount: 220, from: true, note: "per quarter" })).toBe(
      "from $220 (per quarter)",
    );
  });
});

describe("hoursLines", () => {
  const closed: Clinic["hours"] = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };

  it("groups days with the same hours", () => {
    const nineToFive: [string, string][] = [["09:00", "17:00"]];
    expect(
      hoursLines({
        ...closed,
        mon: nineToFive,
        tue: nineToFive,
        wed: nineToFive,
        thu: [["09:00", "12:00"]],
        fri: [["09:00", "12:00"]],
      }),
    ).toEqual([
      { days: "Monday to Wednesday", hours: "9 AM to 5 PM" },
      { days: "Thursday and Friday", hours: "9 AM to noon" },
      { days: "Saturday and Sunday", hours: "closed" },
    ]);
  });

  it("lists split days and a single day", () => {
    expect(
      hoursLines({
        ...closed,
        wed: [
          ["08:00", "12:00"],
          ["13:00", "17:00"],
        ],
      }),
    ).toEqual([
      { days: "Monday and Tuesday", hours: "closed" },
      { days: "Wednesday", hours: "8 AM to noon, 1 PM to 5 PM" },
      { days: "Thursday to Sunday", hours: "closed" },
    ]);
  });
});

describe("joinList", () => {
  it("joins for speech", () => {
    expect(joinList([])).toBe("");
    expect(joinList(["a"])).toBe("a");
    expect(joinList(["a", "b"], "or")).toBe("a or b");
    expect(joinList(["a", "b", "c"])).toBe("a, b and c");
  });
});
