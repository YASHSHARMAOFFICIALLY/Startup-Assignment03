export const fmtCurrency = (n: number) => `$${n.toLocaleString()}`;

export const fmtCurrencyOrDash = (n: number | null) =>
  n === null ? "\u2014" : fmtCurrency(n);

export const fmtPercentOrDash = (n: number | null) =>
  n === null ? "\u2014" : `${n}%`;

export function rankBadgeClass(rank: number) {
  if (rank === 1)
    return "bg-brand-accent/10 text-brand-gold";
  if (rank === 2)
    return "bg-white/[0.06] text-brand-silver";
  if (rank === 3)
    return "bg-white/[0.04] text-brand-bronze";
  return "";
}
