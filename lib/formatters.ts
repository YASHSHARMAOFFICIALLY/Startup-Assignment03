export const fmtCurrency = (n: number) => `$${n.toLocaleString()}`;

export const fmtCurrencyOrDash = (n: number | null) =>
  n === null ? "\u2014" : fmtCurrency(n);

export const fmtPercentOrDash = (n: number | null) =>
  n === null ? "\u2014" : `${n}%`;

export function rankBadgeClass(rank: number) {
  if (rank === 1)
    return "bg-gradient-to-br from-brand-accent/20 to-brand-accent/10 text-brand-gold border border-brand-gold/20";
  if (rank === 2)
    return "bg-gradient-to-br from-brand-silver/15 to-brand-silver/10 text-brand-silver border border-brand-silver/20";
  if (rank === 3)
    return "bg-gradient-to-br from-brand-bronze/20 to-brand-bronze/10 text-brand-bronze border border-brand-bronze/20";
  return "";
}
