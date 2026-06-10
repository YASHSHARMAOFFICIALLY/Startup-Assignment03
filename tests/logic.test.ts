import { describe, it, expect } from "vitest";
import { parseCSV, num, dayKey, priorRange, aggregate } from "@/lib/sheet-sync";
import { resolvePeriod } from "@/lib/period";
import { parseSort, sortRows } from "@/lib/sort";
import { fmtCurrency, fmtPercentOrDash } from "@/lib/formatters";
import type { RecordsBundle } from "@/lib/sheet-sync";

/* ------------------------------------------------------------------ */
/* 1. CSV PARSING                                                       */
/* ------------------------------------------------------------------ */
describe("parseCSV", () => {
  it("parses simple rows", () => {
    expect(parseCSV("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields containing commas", () => {
    expect(parseCSV('"hello, world",b')).toEqual([["hello, world", "b"]]);
  });

  it("handles quoted fields containing newlines", () => {
    const result = parseCSV('"line1\nline2",end');
    expect(result).toEqual([["line1\nline2", "end"]]);
  });

  it("handles escaped double quotes inside quoted fields", () => {
    expect(parseCSV('"say ""hello""",b')).toEqual([['say "hello"', "b"]]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCSV("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles trailing row without trailing newline", () => {
    const result = parseCSV("a,b\nc,d");
    expect(result.length).toBe(2);
    expect(result[1]).toEqual(["c", "d"]);
  });

  it("handles trailing newline without extra empty row", () => {
    // File ending in \n: the final empty segment produces one row pushed
    // The current implementation pushes it if field!=='' or row.length>0
    // A file "a,b\n" ends with row ["a","b"] pushed at \n; then field="" row=[] -> not pushed
    const result = parseCSV("a,b\n");
    expect(result).toEqual([["a", "b"]]);
  });
});

/* ------------------------------------------------------------------ */
/* 2. NUMBER COERCION                                                   */
/* ------------------------------------------------------------------ */
describe("num", () => {
  it("parses currency strings", () => {
    expect(num("$1,234.56")).toBe(1234.56);
  });

  it("strips percent sign", () => {
    expect(num("12%")).toBe(12);
  });

  it("returns 0 for empty string", () => {
    expect(num("")).toBe(0);
  });

  it("returns 0 for garbage strings", () => {
    expect(num("abc")).toBe(0);
    expect(num("N/A")).toBe(0);
  });

  it("parses plain integers", () => {
    expect(num("42")).toBe(42);
  });

  it("returns 0 for undefined", () => {
    expect(num(undefined)).toBe(0);
  });

  it("strips leading dollar sign without comma", () => {
    expect(num("$500")).toBe(500);
  });
});

/* ------------------------------------------------------------------ */
/* 3. DATE NORMALIZATION (dayKey)                                       */
/* ------------------------------------------------------------------ */
describe("dayKey", () => {
  it("zero-pads ISO month and day", () => {
    expect(dayKey("2026-6-5")).toBe("2026-06-05");
  });

  it("converts US slash format to ISO", () => {
    expect(dayKey("6/5/2026")).toBe("2026-06-05");
  });

  it("returns null for invalid/empty input", () => {
    expect(dayKey("")).toBeNull();
    expect(dayKey(undefined)).toBeNull();
    expect(dayKey("not-a-date")).toBeNull();
  });

  it("passes through already-padded ISO date", () => {
    expect(dayKey("2026-05-04")).toBe("2026-05-04");
  });
});

/* ------------------------------------------------------------------ */
/* 4. aggregate() — formulas + leaderboard + alias grouping + commissions */
/* ------------------------------------------------------------------ */

function makeBundle(partial: Partial<RecordsBundle>): RecordsBundle {
  return {
    closer: [],
    phone: [],
    dm: [],
    syncedAt: "2026-06-10T00:00:00Z",
    ...partial,
  };
}

describe("aggregate — closer formulas", () => {
  // 2 closer records: one show+close, one no-show
  const bundle = makeBundle({
    closer: [
      {
        date: "2026-06-01",
        name: "Alice",
        totalCalls: 1,
        noShows: 0,
        cancellations: 0,
        reschedules: 0,
        liveCalls: 1,
        offers: 1,
        deposits: 0,
        dealsClosed: 1,
        revenue: 5000,
        cash: 3000,
        mrr: 0,
        dayRating: 5,
        objection: "",
        didWell: "",
        improve: "",
        reviewLink: "",
      },
      {
        date: "2026-06-02",
        name: "Alice",
        totalCalls: 1,
        noShows: 1,
        cancellations: 0,
        reschedules: 0,
        liveCalls: 0,
        offers: 0,
        deposits: 0,
        dealsClosed: 0,
        revenue: 0,
        cash: 0,
        mrr: 0,
        dayRating: 3,
        objection: "",
        didWell: "",
        improve: "",
        reviewLink: "",
      },
    ],
  });

  it("computes showRate = pct(liveCalls, totalCalls)", () => {
    const result = aggregate(bundle, null, null, "All Time");
    // liveCalls=1, totalCalls=2 -> 50%
    expect(result.closerKPIs.showRate).toBe(50);
  });

  it("computes showToClose = pct(dealsClosed, liveCalls)", () => {
    const result = aggregate(bundle, null, null, "All Time");
    // dealsClosed=1, liveCalls=1 -> 100%
    expect(result.closerKPIs.showToClose).toBe(100);
  });

  it("computes offerToClose = pct(dealsClosed, offers)", () => {
    const result = aggregate(bundle, null, null, "All Time");
    // dealsClosed=1, offers=1 -> 100%
    expect(result.closerKPIs.offerToClose).toBe(100);
  });

  it("computes cashPerBookedCall = cash / totalCalls", () => {
    const result = aggregate(bundle, null, null, "All Time");
    // cash=3000, totalCalls=2 -> 1500
    expect(result.closerKPIs.cashPerBookedCall).toBe(1500);
  });

  it("computes closeRate = pct(dealsClosed, totalCalls)", () => {
    const result = aggregate(bundle, null, null, "All Time");
    // dealsClosed=1, totalCalls=2 -> 50%
    expect(result.closerKPIs.closeRate).toBe(50);
  });
});

describe("aggregate — empty bundle", () => {
  it("returns zeros, no NaN, and empty leaderboards", () => {
    const result = aggregate(makeBundle({}), null, null, "All Time");
    expect(result.closerKPIs.showRate).toBe(0);
    expect(result.closerKPIs.closeRate).toBe(0);
    expect(result.closerKPIs.cashPerBookedCall).toBe(0);
    expect(result.closerKPIs.commissionsPaid).toBe(0);
    expect(result.setterKPIs.totalCallsSet).toBe(0);
    expect(result.closers).toEqual([]);
    expect(result.setters).toEqual([]);
  });
});

describe("aggregate — setter KPIs", () => {
  const bundle = makeBundle({
    phone: [
      {
        date: "2026-06-01",
        name: "Bob",
        hoursWorked: 4,
        pickups: 10,
        dials: 50,
        qConvos: 8,
        shortConvos: 2,
        booked: 3,
        shows: 2,
        noShows: 1,
        reschedules: 0,
        closed: 0,
        revenue: 0,
        cash: 0,
        dayRating: 4,
        objection: "",
        didWell: "",
        improve: "",
        reviewLink: "",
      },
    ],
    dm: [
      {
        date: "2026-06-01",
        name: "Carol",
        convos: 20,
        swipeUps: 5,
        followUps: 10,
        booked: 4,
        onCalendar: 4,
        liveCalls: 3,
        setsClosed: 1,
        revenue: 0,
        cash: 0,
        dayRating: 4,
        objection: "",
        didWell: "",
        improve: "",
        reviewLink: "",
      },
    ],
  });

  it("totalCallsSet = phone.booked + dm.booked", () => {
    const result = aggregate(bundle, null, null, "All Time");
    expect(result.setterKPIs.totalCallsSet).toBe(7);
  });

  it("totalShows = phone.shows + dm.liveCalls (DM proxy)", () => {
    const result = aggregate(bundle, null, null, "All Time");
    expect(result.setterKPIs.totalShows).toBe(5);
  });

  it("noShows = phone only", () => {
    const result = aggregate(bundle, null, null, "All Time");
    expect(result.setterKPIs.noShows).toBe(1);
  });
});

describe("aggregate — leaderboard ordering", () => {
  const bundle = makeBundle({
    closer: [
      {
        date: "2026-06-01", name: "Low", totalCalls: 1, noShows: 0,
        cancellations: 0, reschedules: 0, liveCalls: 1, offers: 1,
        deposits: 0, dealsClosed: 1, revenue: 1000, cash: 1000,
        mrr: 0, dayRating: 4, objection: "", didWell: "", improve: "", reviewLink: "",
      },
      {
        date: "2026-06-01", name: "High", totalCalls: 1, noShows: 0,
        cancellations: 0, reschedules: 0, liveCalls: 1, offers: 1,
        deposits: 0, dealsClosed: 2, revenue: 5000, cash: 5000,
        mrr: 0, dayRating: 5, objection: "", didWell: "", improve: "", reviewLink: "",
      },
    ],
    phone: [
      {
        date: "2026-06-01", name: "TopSetter", hoursWorked: 4, pickups: 10,
        dials: 50, qConvos: 8, shortConvos: 2, booked: 10, shows: 8,
        noShows: 2, reschedules: 0, closed: 0, revenue: 0, cash: 0,
        dayRating: 5, objection: "", didWell: "", improve: "", reviewLink: "",
      },
      {
        date: "2026-06-01", name: "LowSetter", hoursWorked: 2, pickups: 5,
        dials: 20, qConvos: 4, shortConvos: 1, booked: 2, shows: 1,
        noShows: 1, reschedules: 0, closed: 0, revenue: 0, cash: 0,
        dayRating: 3, objection: "", didWell: "", improve: "", reviewLink: "",
      },
    ],
  });

  it("closers sorted by cash descending", () => {
    const result = aggregate(bundle, null, null, "All Time");
    expect(result.closers[0].name).toBe("High");
    expect(result.closers[1].name).toBe("Low");
  });

  it("setters sorted by callsSet descending", () => {
    const result = aggregate(bundle, null, null, "All Time");
    expect(result.setters[0].name).toBe("TopSetter");
    expect(result.setters[1].name).toBe("LowSetter");
  });

  it("SetterRep.showRate computed correctly", () => {
    const result = aggregate(bundle, null, null, "All Time");
    const top = result.setters.find((s) => s.name === "TopSetter")!;
    // shows=8, booked=10 -> 80%
    expect(top.showRate).toBe(80);
  });
});

describe("aggregate — alias map grouping", () => {
  // Two raw spellings for the same rep
  const bundle = makeBundle({
    closer: [
      {
        date: "2026-06-01", name: "alice smith", totalCalls: 1, noShows: 0,
        cancellations: 0, reschedules: 0, liveCalls: 1, offers: 1,
        deposits: 0, dealsClosed: 1, revenue: 2000, cash: 2000,
        mrr: 0, dayRating: 5, objection: "", didWell: "", improve: "", reviewLink: "",
      },
      {
        date: "2026-06-02", name: "Alice Smith", totalCalls: 1, noShows: 0,
        cancellations: 0, reschedules: 0, liveCalls: 1, offers: 1,
        deposits: 0, dealsClosed: 1, revenue: 3000, cash: 3000,
        mrr: 0, dayRating: 5, objection: "", didWell: "", improve: "", reviewLink: "",
      },
    ],
  });

  it("merges two raw spellings into one canonical rep via alias map", () => {
    const aliasMap = new Map<string, string>([
      ["alice smith", "Alice Smith"],
    ]);
    const result = aggregate(bundle, null, null, "All Time", aliasMap);
    expect(result.closers.length).toBe(1);
    expect(result.closers[0].cashCollected).toBe(5000);
  });

  it("keeps them separate without alias map (case-sensitive)", () => {
    const result = aggregate(bundle, null, null, "All Time");
    expect(result.closers.length).toBe(2);
  });
});

describe("aggregate — commissions", () => {
  const bundle = makeBundle({
    closer: [
      {
        date: "2026-06-01", name: "Alice", totalCalls: 1, noShows: 0,
        cancellations: 0, reschedules: 0, liveCalls: 1, offers: 1,
        deposits: 0, dealsClosed: 1, revenue: 5000, cash: 10000,
        mrr: 0, dayRating: 5, objection: "", didWell: "", improve: "", reviewLink: "",
      },
    ],
  });

  it("flat commission rate", () => {
    const result = aggregate(bundle, null, null, "All Time", undefined, 10);
    // 10000 * 10% = 1000
    expect(result.closerKPIs.commissionsPaid).toBe(1000);
  });

  it("per-rep commission rate override", () => {
    const repRates = new Map<string, number>([["Alice", 15]]);
    const result = aggregate(bundle, null, null, "All Time", undefined, 10, repRates);
    // 10000 * 15% = 1500
    expect(result.closerKPIs.commissionsPaid).toBe(1500);
  });

  it("falls back to flat rate when rep not in override map", () => {
    const repRates = new Map<string, number>([["Bob", 15]]);
    const result = aggregate(bundle, null, null, "All Time", undefined, 10, repRates);
    // Alice not in override, fallback to 10% -> 1000
    expect(result.closerKPIs.commissionsPaid).toBe(1000);
  });
});

/* ------------------------------------------------------------------ */
/* 5. priorRange                                                        */
/* ------------------------------------------------------------------ */
describe("priorRange", () => {
  it("returns equal-length preceding window", () => {
    // from 2026-06-01 to 2026-06-07 (7 days)
    const result = priorRange("2026-06-01", "2026-06-07");
    // prior should be 2026-05-25 to 2026-05-31 (7 days, ending day before from)
    expect(result.from).toBe("2026-05-25");
    expect(result.to).toBe("2026-05-31");
  });

  it("returns null passthrough for null inputs", () => {
    expect(priorRange(null, null)).toEqual({ from: null, to: null });
    expect(priorRange("2026-06-01", null)).toEqual({ from: null, to: null });
    expect(priorRange(null, "2026-06-07")).toEqual({ from: null, to: null });
  });
});

/* ------------------------------------------------------------------ */
/* 6. resolvePeriod                                                     */
/* ------------------------------------------------------------------ */
describe("resolvePeriod", () => {
  const now = new Date("2026-06-10T12:00:00Z");

  it("custom with from/to returns them unchanged", () => {
    const result = resolvePeriod("custom", "2026-05-01", "2026-05-31", now);
    expect(result.from).toBe("2026-05-01");
    expect(result.to).toBe("2026-05-31");
  });

  it("all-time returns null from and to", () => {
    const result = resolvePeriod("all-time", null, null, now);
    expect(result.from).toBeNull();
    expect(result.to).toBeNull();
  });

  it("this-month from <= to", () => {
    const result = resolvePeriod("this-month", null, null, now);
    expect(result.from).not.toBeNull();
    expect(result.to).not.toBeNull();
    expect(result.from! <= result.to!).toBe(true);
  });

  it("last-month from <= to", () => {
    const result = resolvePeriod("last-month", null, null, now);
    expect(result.from! <= result.to!).toBe(true);
  });

  it("this-week from <= to", () => {
    const result = resolvePeriod("this-week", null, null, now);
    expect(result.from! <= result.to!).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 7. parseSort / sortRows                                              */
/* ------------------------------------------------------------------ */
describe("parseSort", () => {
  const allowed = ["name", "cash", "rank"];

  it("returns field and dir=1 for plain valid field", () => {
    expect(parseSort("name", allowed, "rank")).toEqual({ field: "name", dir: 1 });
  });

  it("returns field and dir=-1 for negated valid field", () => {
    expect(parseSort("-cash", allowed, "rank")).toEqual({ field: "cash", dir: -1 });
  });

  it("falls back to fallback for invalid field", () => {
    expect(parseSort("unknown", allowed, "rank")).toEqual({ field: "rank", dir: 1 });
  });

  it("falls back to fallback for undefined", () => {
    expect(parseSort(undefined, allowed, "rank")).toEqual({ field: "rank", dir: 1 });
  });

  it("falls back to fallback for negated invalid field", () => {
    expect(parseSort("-unknown", allowed, "rank")).toEqual({ field: "rank", dir: 1 });
  });
});

describe("sortRows", () => {
  const rows = [
    { name: "Charlie", cash: 1000 },
    { name: "Alice", cash: 3000 },
    { name: "Bob", cash: 2000 },
  ];

  it("sorts numerically ascending", () => {
    const result = sortRows(rows, "cash", 1);
    expect(result.map((r) => r.cash)).toEqual([1000, 2000, 3000]);
  });

  it("sorts numerically descending", () => {
    const result = sortRows(rows, "cash", -1);
    expect(result.map((r) => r.cash)).toEqual([3000, 2000, 1000]);
  });

  it("sorts strings alphabetically ascending", () => {
    const result = sortRows(rows, "name", 1);
    expect(result.map((r) => r.name)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("sorts strings descending", () => {
    const result = sortRows(rows, "name", -1);
    expect(result.map((r) => r.name)).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("does not mutate original array", () => {
    const original = [...rows];
    sortRows(rows, "cash", -1);
    expect(rows).toEqual(original);
  });
});

/* ------------------------------------------------------------------ */
/* 8. Formatters                                                        */
/* ------------------------------------------------------------------ */
describe("fmtCurrency", () => {
  it("formats zero", () => {
    expect(fmtCurrency(0)).toBe("$0");
  });

  it("formats positive integer", () => {
    // toLocaleString output varies by locale in node; check it starts with $ and contains the digits
    const result = fmtCurrency(1000);
    expect(result.startsWith("$")).toBe(true);
    expect(result).toContain("1");
    expect(result).toContain("000");
  });

  it("formats large number with locale separators", () => {
    const result = fmtCurrency(1234567);
    expect(result.startsWith("$")).toBe(true);
  });
});

describe("fmtPercentOrDash", () => {
  it("returns em dash for null", () => {
    expect(fmtPercentOrDash(null)).toBe("—");
  });

  it("formats zero percent", () => {
    expect(fmtPercentOrDash(0)).toBe("0%");
  });

  it("formats positive percent", () => {
    expect(fmtPercentOrDash(75)).toBe("75%");
  });

  it("formats 100%", () => {
    expect(fmtPercentOrDash(100)).toBe("100%");
  });
});
