import type {
  CloserRep,
  DashboardData,
  Offer,
  SetterRep,
} from "@/lib/types";

/* ----------------------------- CSV parsing ------------------------------- */

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* --------------------------- Number helpers ------------------------------ */

function num(value: string | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(value.replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const round = (n: number) => Math.round(n);

/* ------------------------- Google Sheets fetch --------------------------- */

function spreadsheetId(url: string): string {
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) throw new Error(`Could not parse spreadsheet id from URL: ${url}`);
  return id;
}

async function fetchNamedTab(id: string, tabName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    tabName,
  )}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Could not read "${tabName}". Make sure the sheet is shared as "Anyone with the link can view".`,
    );
  }
  return parseCSV(await res.text());
}

// "2026-05-04" -> "2026-05-04" (zero-padded), null if unparseable
function dayKey(value: string | undefined): string | null {
  if (!value) return null;
  const iso = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso)
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return null;
}

/* --------------------------- Raw column maps ----------------------------- */

const C = { NAME: 3, DATE: 4, TOTAL: 5, NOSHOW: 6, CANCEL: 7, RESCHED: 8, LIVE: 9, OFFERS: 10, DEPOSITS: 11, CLOSED: 12, REV: 13, CASH: 14, MRR: 15, DAY_RATING: 16, OBJECTION: 17, DID_WELL: 18, IMPROVE: 19, REVIEW_LINK: 20 };
const P = { NAME: 3, DATE: 4, HOURS: 5, PICKUPS: 6, DIALS: 7, QCONVOS: 8, SHORT_CONVOS: 9, BOOKED: 10, SHOWS: 11, NOSHOW: 12, RESCHED: 13, CLOSED: 14, REV: 15, CASH: 16, DAY_RATING: 17, OBJECTION: 18, DID_WELL: 19, IMPROVE: 20, REVIEW_LINK: 21 };
const D = { NAME: 3, DATE: 4, CONVOS: 5, SWIPE_UPS: 6, FOLLOW_UPS: 7, BOOKED: 8, ON_CALENDAR: 9, LIVE: 10, SETS_CLOSED: 11, REV: 12, CASH: 13, DAY_RATING: 14, OBJECTION: 15, DID_WELL: 16, IMPROVE: 17, REVIEW_LINK: 18 };

/* ------------------------------- Records --------------------------------- */

export type CloserRecord = {
  date: string;
  name: string;
  totalCalls: number;
  noShows: number;
  cancellations: number;
  reschedules: number;
  liveCalls: number;
  offers: number;
  deposits: number;
  dealsClosed: number;
  revenue: number;
  cash: number;
  mrr: number;
  dayRating: number;
  objection: string;
  didWell: string;
  improve: string;
  reviewLink: string;
};
export type PhoneRecord = {
  date: string;
  name: string;
  hoursWorked: number;
  pickups: number;
  dials: number;
  qConvos: number;
  shortConvos: number;
  booked: number;
  shows: number;
  noShows: number;
  reschedules: number;
  closed: number;
  revenue: number;
  cash: number;
  dayRating: number;
  objection: string;
  didWell: string;
  improve: string;
  reviewLink: string;
};
export type DmRecord = {
  date: string;
  name: string;
  convos: number;
  swipeUps: number;
  followUps: number;
  booked: number;
  onCalendar: number;
  liveCalls: number;
  setsClosed: number;
  revenue: number;
  cash: number;
  dayRating: number;
  objection: string;
  didWell: string;
  improve: string;
  reviewLink: string;
};
export type RecordsBundle = {
  closer: CloserRecord[];
  phone: PhoneRecord[];
  dm: DmRecord[];
  syncedAt: string;
};

const dataRows = (rows: string[][]) => rows.slice(1).filter((r) => r.length > 1);

export async function fetchRecordsFromOffer(
  offer: Offer,
  syncedAt: string,
): Promise<RecordsBundle> {
  const [closerRaw, phoneRaw, dmRaw] = await Promise.all([
    fetchNamedTab(spreadsheetId(offer.closerSheetUrl), "Tally_Closer_Raw"),
    fetchNamedTab(spreadsheetId(offer.phoneSetterSheetUrl), "Tally_PhoneSetter_Raw"),
    fetchNamedTab(spreadsheetId(offer.dmSetterSheetUrl), "Tally_DMSetter_Raw"),
  ]);

  const closer: CloserRecord[] = [];
  for (const r of dataRows(closerRaw)) {
    const date = dayKey(r[C.DATE]);
    if (!date) continue;
    closer.push({
      date,
      name: (r[C.NAME] ?? "").trim(),
      totalCalls: num(r[C.TOTAL]),
      noShows: num(r[C.NOSHOW]),
      cancellations: num(r[C.CANCEL]),
      reschedules: num(r[C.RESCHED]),
      liveCalls: num(r[C.LIVE]),
      offers: num(r[C.OFFERS]),
      deposits: num(r[C.DEPOSITS]),
      dealsClosed: num(r[C.CLOSED]),
      revenue: num(r[C.REV]),
      cash: num(r[C.CASH]),
      mrr: num(r[C.MRR]),
      dayRating: num(r[C.DAY_RATING]),
      objection: (r[C.OBJECTION] ?? "").trim(),
      didWell: (r[C.DID_WELL] ?? "").trim(),
      improve: (r[C.IMPROVE] ?? "").trim(),
      reviewLink: (r[C.REVIEW_LINK] ?? "").trim(),
    });
  }

  const phone: PhoneRecord[] = [];
  for (const r of dataRows(phoneRaw)) {
    const date = dayKey(r[P.DATE]);
    if (!date) continue;
    phone.push({
      date,
      name: (r[P.NAME] ?? "").trim(),
      hoursWorked: num(r[P.HOURS]),
      pickups: num(r[P.PICKUPS]),
      dials: num(r[P.DIALS]),
      qConvos: num(r[P.QCONVOS]),
      shortConvos: num(r[P.SHORT_CONVOS]),
      booked: num(r[P.BOOKED]),
      shows: num(r[P.SHOWS]),
      noShows: num(r[P.NOSHOW]),
      reschedules: num(r[P.RESCHED]),
      closed: num(r[P.CLOSED]),
      revenue: num(r[P.REV]),
      cash: num(r[P.CASH]),
      dayRating: num(r[P.DAY_RATING]),
      objection: (r[P.OBJECTION] ?? "").trim(),
      didWell: (r[P.DID_WELL] ?? "").trim(),
      improve: (r[P.IMPROVE] ?? "").trim(),
      reviewLink: (r[P.REVIEW_LINK] ?? "").trim(),
    });
  }

  const dm: DmRecord[] = [];
  for (const r of dataRows(dmRaw)) {
    const date = dayKey(r[D.DATE]);
    if (!date) continue;
    dm.push({
      date,
      name: (r[D.NAME] ?? "").trim(),
      convos: num(r[D.CONVOS]),
      swipeUps: num(r[D.SWIPE_UPS]),
      followUps: num(r[D.FOLLOW_UPS]),
      booked: num(r[D.BOOKED]),
      onCalendar: num(r[D.ON_CALENDAR]),
      liveCalls: num(r[D.LIVE]),
      setsClosed: num(r[D.SETS_CLOSED]),
      revenue: num(r[D.REV]),
      cash: num(r[D.CASH]),
      dayRating: num(r[D.DAY_RATING]),
      objection: (r[D.OBJECTION] ?? "").trim(),
      didWell: (r[D.DID_WELL] ?? "").trim(),
      improve: (r[D.IMPROVE] ?? "").trim(),
      reviewLink: (r[D.REVIEW_LINK] ?? "").trim(),
    });
  }

  return { closer, phone, dm, syncedAt };
}

/* ------------------------------ Aggregation ------------------------------ */

const sumBy = <T,>(rows: T[], pick: (r: T) => number) =>
  rows.reduce((acc, r) => acc + pick(r), 0);

function closerHero(rows: CloserRecord[]) {
  const totalCalls = sumBy(rows, (r) => r.totalCalls);
  const dealsClosed = sumBy(rows, (r) => r.dealsClosed);
  return {
    totalRevenue: sumBy(rows, (r) => r.revenue),
    cashCollected: sumBy(rows, (r) => r.cash),
    dealsClosed,
    closeRate: pct(dealsClosed, totalCalls),
  };
}

function dailyTrends(rows: CloserRecord[]) {
  const byDay = new Map<string, { rev: number; cash: number; deals: number; calls: number }>();
  for (const r of rows) {
    const cur = byDay.get(r.date) ?? { rev: 0, cash: 0, deals: 0, calls: 0 };
    cur.rev += r.revenue;
    cur.cash += r.cash;
    cur.deals += r.dealsClosed;
    cur.calls += r.totalCalls;
    byDay.set(r.date, cur);
  }
  const totalRevenue = [0];
  const cashCollected = [0];
  const dealsClosed = [0];
  const closeRate = [0];
  let rev = 0, cash = 0, deals = 0, calls = 0;
  for (const d of Array.from(byDay.keys()).sort()) {
    const v = byDay.get(d)!;
    rev += v.rev; cash += v.cash; deals += v.deals; calls += v.calls;
    totalRevenue.push(rev);
    cashCollected.push(cash);
    dealsClosed.push(deals);
    closeRate.push(pct(deals, calls));
  }
  return { totalRevenue, cashCollected, dealsClosed, closeRate };
}

const inRange = (d: string, from: string | null, to: string | null) =>
  (from === null || d >= from) && (to === null || d <= to);

// Preceding period of equal length (for "vs prior" deltas).
export function priorRange(from: string | null, to: string | null) {
  if (!from || !to) return { from: null, to: null };
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  const lenMs = t.getTime() - f.getTime() + 86400000;
  const pt = new Date(f.getTime() - 86400000);
  const pf = new Date(pt.getTime() - lenMs + 86400000);
  return { from: pf.toISOString().slice(0, 10), to: pt.toISOString().slice(0, 10) };
}

export function aggregate(
  records: RecordsBundle,
  from: string | null,
  to: string | null,
  label: string,
  aliasMap?: Map<string, string>,
): DashboardData {
  const resolveName = aliasMap
    ? (name: string) => aliasMap.get(name) ?? name
    : (name: string) => name;

  const closer = records.closer.filter((r) => inRange(r.date, from, to));
  const phone = records.phone.filter((r) => inRange(r.date, from, to));
  const dm = records.dm.filter((r) => inRange(r.date, from, to));

  // ---- Closer KPIs ----
  const cTotal = sumBy(closer, (r) => r.totalCalls);
  const cLive = sumBy(closer, (r) => r.liveCalls);
  const cOffers = sumBy(closer, (r) => r.offers);
  const cClosed = sumBy(closer, (r) => r.dealsClosed);
  const cCash = sumBy(closer, (r) => r.cash);
  const closerKPIs = {
    cashCollected: cCash,
    totalRevenue: sumBy(closer, (r) => r.revenue),
    commissionsPaid: 0,
    dealsClosed: cClosed,
    noShows: sumBy(closer, (r) => r.noShows),
    cancellations: sumBy(closer, (r) => r.cancellations),
    showRate: pct(cLive, cTotal),
    bookedToClose: pct(cClosed, cTotal),
    showToClose: pct(cClosed, cLive),
    offerToClose: pct(cClosed, cOffers),
    cashPerBookedCall: cTotal > 0 ? round(cCash / cTotal) : 0,
    closeRate: pct(cClosed, cTotal),
  };

  // ---- Setter KPIs ----
  const pBooked = sumBy(phone, (r) => r.booked);
  const pShows = sumBy(phone, (r) => r.shows);
  const pQ = sumBy(phone, (r) => r.qConvos);
  const dBooked = sumBy(dm, (r) => r.booked);
  const dConvos = sumBy(dm, (r) => r.convos);
  const dLive = sumBy(dm, (r) => r.liveCalls);
  const setterKPIs = {
    totalCallsSet: pBooked + dBooked,
    totalShows: pShows + dLive,
    noShows: sumBy(phone, (r) => r.noShows),
    phoneSetRate: pct(pBooked, pQ),
    phoneShowRate: pct(pShows, pBooked),
    dmBookRate: pct(dBooked, dConvos),
    dmShowRate: pct(dLive, dBooked),
    revenueGenerated: sumBy(phone, (r) => r.revenue) + sumBy(dm, (r) => r.revenue),
    cashCollected: sumBy(phone, (r) => r.cash) + sumBy(dm, (r) => r.cash),
  };

  // ---- Leaderboards ----
  const closersMap = new Map<string, { cash: number; closed: number; calls: number }>();
  for (const r of closer) {
    if (!r.name) continue;
    const name = resolveName(r.name);
    const c = closersMap.get(name) ?? { cash: 0, closed: 0, calls: 0 };
    c.cash += r.cash;
    c.closed += r.dealsClosed;
    c.calls += r.totalCalls;
    closersMap.set(name, c);
  }
  const closers: CloserRep[] = Array.from(closersMap.entries())
    .map(([name, v], i) => ({
      id: String(i + 1),
      name,
      rank: 0,
      cashCollected: v.cash,
      dealsClosed: v.closed,
      bookedToClose: v.calls > 0 ? pct(v.closed, v.calls) : null,
      avgDealValue: v.closed > 0 ? round(v.cash / v.closed) : null,
    }))
    .sort((a, b) => b.cashCollected - a.cashCollected)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const settersMap = new Map<string, { calls: number; rev: number }>();
  for (const r of phone) {
    if (!r.name) continue;
    const name = resolveName(r.name);
    const s = settersMap.get(name) ?? { calls: 0, rev: 0 };
    s.calls += r.booked;
    s.rev += r.revenue;
    settersMap.set(name, s);
  }
  for (const r of dm) {
    if (!r.name) continue;
    const name = resolveName(r.name);
    const s = settersMap.get(name) ?? { calls: 0, rev: 0 };
    s.calls += r.booked;
    s.rev += r.revenue;
    settersMap.set(name, s);
  }
  const setters: SetterRep[] = Array.from(settersMap.entries())
    .map(([name, v], i) => ({
      id: String(i + 1),
      name,
      rank: 0,
      callsSet: v.calls,
      revenueGenerated: v.rev,
    }))
    .sort((a, b) => b.callsSet - a.callsSet)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // ---- Deltas (vs preceding equal-length period) ----
  const prev = priorRange(from, to);
  const cur = closerHero(closer);
  const prv = closerHero(
    records.closer.filter((r) => inRange(r.date, prev.from, prev.to)),
  );
  const delta = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / b) * 100));

  return {
    period: label,
    closerKPIs,
    setterKPIs,
    closers,
    setters,
    deltas: {
      totalRevenue: delta(cur.totalRevenue, prv.totalRevenue),
      cashCollected: delta(cur.cashCollected, prv.cashCollected),
      dealsClosed: delta(cur.dealsClosed, prv.dealsClosed),
      closeRate: delta(cur.closeRate, prv.closeRate),
    },
    trends: dailyTrends(closer),
  };
}
