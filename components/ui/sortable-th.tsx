import Link from "next/link";
import { th } from "@/lib/table-styles";

export function SortableTh({
  label,
  field,
  sort,
  basePath,
  query,
  align = "left",
  paramName = "sort",
}: {
  label: string;
  field: string;
  sort: string;
  basePath: string;
  query: Record<string, string>;
  align?: "left" | "right" | "center";
  paramName?: string;
}) {
  const desc = sort === `-${field}`;
  const active = desc || sort === field;
  const next = desc ? field : `-${field}`;

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v) params.set(k, v);
  }
  params.set(paramName, next);

  const alignClass =
    align === "right" ? " text-right" : align === "center" ? " text-center" : "";

  return (
    <th scope="col" className={`${th}${alignClass}`}>
      <Link
        href={`${basePath}?${params.toString()}`}
        className="hover:text-brand-textSecondary transition-colors whitespace-nowrap"
      >
        {label}
        {active && (
          <span className="ml-1 text-brand-accent">{desc ? "▼" : "▲"}</span>
        )}
      </Link>
    </th>
  );
}
