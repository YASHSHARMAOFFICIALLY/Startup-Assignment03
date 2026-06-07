export type PeriodKey =
  | "all-time"
  | "this-week"
  | "this-month"
  | "last-month"
  | "custom";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "all-time", label: "All Time" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "custom", label: "Custom Range" },
];

const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function resolvePeriod(
  period: PeriodKey,
  fromStr: string | null,
  toStr: string | null,
  now: Date,
): { from: string | null; to: string | null; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  const d = now.getDate();

  switch (period) {
    case "all-time":
      return { from: null, to: null, label: "All Time" };

    case "this-month": {
      const last = new Date(y, m, 0).getDate();
      return { from: ymd(y, m, 1), to: ymd(y, m, last), label: "This Month" };
    }

    case "last-month": {
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      const last = new Date(py, pm, 0).getDate();
      return { from: ymd(py, pm, 1), to: ymd(py, pm, last), label: "Last Month" };
    }

    case "this-week": {
      const today = new Date(y, m - 1, d);
      const dow = (today.getDay() + 6) % 7; // 0 = Monday
      const mon = new Date(today);
      mon.setDate(today.getDate() - dow);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return {
        from: ymd(mon.getFullYear(), mon.getMonth() + 1, mon.getDate()),
        to: ymd(sun.getFullYear(), sun.getMonth() + 1, sun.getDate()),
        label: "This Week",
      };
    }

    case "custom":
      return {
        from: fromStr || null,
        to: toStr || null,
        label: "Custom Range",
      };

    default:
      return { from: null, to: null, label: "All Time" };
  }
}
