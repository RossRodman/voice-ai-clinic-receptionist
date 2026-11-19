import { afterEach, describe, expect, it } from "vitest";
import { TEST_NOW, testApp } from "../test/helpers.ts";
import { callStats, statsPeriod } from "./stats.ts";
import type { CallStat } from "./types.ts";

const TZ = "America/Chicago";

const call = (startedAt: string, outcome: CallStat["outcome"], durationSeconds = 60): CallStat => ({
  startedAt,
  status: "ended",
  outcome,
  durationSeconds,
});

describe("statsPeriod", () => {
  it("counts back from today in the clinic's time zone", () => {
    // 16:00 UTC is 10 AM in Chicago.
    expect(statsPeriod(7, TEST_NOW, TZ)).toEqual({
      from: "2026-11-11",
      to: "2026-11-17",
      days: 7,
      since: "2026-11-11T06:00:00.000Z",
    });
  });

  it("is still yesterday in Chicago just after midnight UTC", () => {
    expect(statsPeriod(1, new Date("2026-11-18T03:00:00Z"), TZ).to).toBe("2026-11-17");
  });
});

describe("callStats", () => {
  const period = statsPeriod(3, TEST_NOW, TZ);

  it("counts calls per local day and by outcome", () => {
    const stats = callStats(
      [
        call("2026-11-15T15:00:00Z", "booked", 120),
        call("2026-11-16T04:30:00Z", "answered", 60), // Nov 15, 10:30 PM in Chicago
        call("2026-11-16T15:00:00Z", "transferred", 90),
        call("2026-11-17T14:00:00Z", "hung-up", 3),
        call("2026-11-17T15:00:00Z", "booked", 150),
        {
          startedAt: "2026-11-17T15:59:00Z",
          status: "in-progress",
          outcome: null,
          durationSeconds: null,
        },
      ],
      period,
      TZ,
    );

    expect(stats.perDay).toEqual([
      { date: "2026-11-15", calls: 2, booked: 1 },
      { date: "2026-11-16", calls: 1, booked: 0 },
      { date: "2026-11-17", calls: 3, booked: 1 },
    ]);
    expect(stats.outcomes).toEqual({
      booked: 2,
      transferred: 1,
      answered: 1,
      "hung-up": 1,
      failed: 0,
      "in-progress": 1,
      unknown: 0,
    });
    expect(stats.totals).toEqual({
      calls: 6,
      booked: 2,
      transferred: 1,
      bookingRate: 0.5,
      averageDurationSeconds: 85,
    });
  });

  it("leaves rates empty when there are no calls", () => {
    const stats = callStats([], period, TZ);

    expect(stats.perDay).toHaveLength(3);
    expect(stats.totals).toEqual({
      calls: 0,
      booked: 0,
      transferred: 0,
      bookingRate: null,
      averageDurationSeconds: null,
    });
  });

  it("ignores calls outside the period", () => {
    const stats = callStats([call("2026-11-14T15:00:00Z", "booked")], period, TZ);

    expect(stats.totals.calls).toBe(0);
  });
});

describe("GET /api/stats and call filters", () => {
  let app: Awaited<ReturnType<typeof testApp>>;

  afterEach(() => app.close());

  async function seed() {
    app = await testApp();
    const calls = [
      {
        id: "a",
        startedAt: "2026-11-10T15:00:00Z",
        outcome: "booked",
        customerNumber: "+15550000001",
      },
      {
        id: "b",
        startedAt: "2026-11-16T15:00:00Z",
        outcome: "booked",
        customerNumber: "+15550000002",
      },
      {
        id: "c",
        startedAt: "2026-11-17T14:00:00Z",
        outcome: "transferred",
        summary: "Asked about a root canal.",
      },
      {
        id: "d",
        startedAt: "2026-11-17T15:00:00Z",
        outcome: "answered",
        customerNumber: "+15550000004",
      },
    ] as const;

    for (const c of calls) {
      await app.callStore.saveCall({ ...c, status: "ended", durationSeconds: 60 });
    }

    await app.callStore.openCall({ id: "live", startedAt: "2026-11-17T15:58:00Z" });
  }

  const ids = async (url: string) =>
    (await app.inject(url)).json().calls.map((c: { id: string }) => c.id);

  it("reports the last days", async () => {
    await seed();
    const res = await app.inject("/api/stats?days=7");

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      callLog: "memory",
      timezone: "America/Chicago",
      from: "2026-11-11",
      to: "2026-11-17",
      totals: { calls: 4, booked: 1, transferred: 1, bookingRate: 1 / 3 },
    });
    expect(res.json().perDay).toHaveLength(7);
    expect((await app.inject("/api/stats?days=91")).statusCode).toBe(400);
  });

  it("filters the call log by outcome, by day and by text", async () => {
    await seed();

    expect(await ids("/api/calls?outcome=booked")).toEqual(["b", "a"]);
    expect(await ids("/api/calls?outcome=in-progress")).toEqual(["live"]);
    expect(await ids("/api/calls?from=2026-11-17")).toEqual(["live", "d", "c"]);
    expect(await ids("/api/calls?from=2026-11-16&to=2026-11-16")).toEqual(["b"]);
    expect(await ids("/api/calls?q=ROOT%20canal")).toEqual(["c"]);
    expect(await ids("/api/calls?q=0000004")).toEqual(["d"]);
  });

  it("refuses filters that make no sense", async () => {
    await seed();

    for (const query of ["outcome=maybe", "from=2026-13-01", "from=2026-11-17&to=2026-11-16"]) {
      expect((await app.inject(`/api/calls?${query}`)).statusCode).toBe(400);
    }
  });
});
