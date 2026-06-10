export function parseSort(
  raw: string | undefined,
  allowed: string[],
  fallback: string,
): { field: string; dir: 1 | -1 } {
  const stripped = raw?.startsWith("-") ? raw.slice(1) : raw;
  const value = raw && stripped && allowed.includes(stripped) ? raw : fallback;
  const desc = value.startsWith("-");
  return { field: desc ? value.slice(1) : value, dir: desc ? -1 : 1 };
}

export function sortRows<T>(rows: T[], field: string, dir: 1 | -1): T[] {
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[field];
    const bv = (b as Record<string, unknown>)[field];
    if (typeof av === "number" || typeof bv === "number") {
      const an = typeof av === "number" ? av : -Infinity;
      const bn = typeof bv === "number" ? bv : -Infinity;
      return (an - bn) * dir;
    }
    return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
  });
}
