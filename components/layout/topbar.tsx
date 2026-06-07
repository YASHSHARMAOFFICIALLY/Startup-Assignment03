"use client";

import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar, ChevronDown, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

import { APP_CONFIG } from "@/lib/config";
import { MobileMenuButton } from "@/components/layout/mobile-nav";
import { PERIOD_OPTIONS, type PeriodKey } from "@/lib/period";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const period = (searchParams.get("period") as PeriodKey) || "last-month";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const label =
    PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "Last Month";

  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePeriod(p: PeriodKey) {
    if (p === "custom") {
      navigate({ period: p });
    } else {
      // Clear custom date range when switching to preset
      navigate({ period: p, from: "", to: "" });
    }
  }

  const dateInput =
    "bg-transparent border border-brand-border rounded-md px-2 py-1 text-xs text-brand-textSecondary [color-scheme:dark] hover:border-brand-border/80 focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg focus-visible:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-brand-border bg-transparent text-xs text-brand-textSecondary hover:bg-white/[0.04] hover:border-brand-border/80 transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg focus-visible:outline-none">
            <Calendar size={14} className="text-brand-textFaint" />
            <span>{label}</span>
            <ChevronDown size={14} className="text-brand-textFaint ml-2" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="border-brand-border bg-brand-surface text-brand-textSecondary"
        >
          {PERIOD_OPTIONS.map((o) => (
            <DropdownMenuItem
              key={o.value}
              onClick={() => handlePeriod(o.value)}
              className={`cursor-pointer text-xs focus:bg-brand-elevated focus:text-brand-textPrimary ${
                period === o.value ? "text-brand-textPrimary" : ""
              }`}
            >
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {period === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="From date"
            value={from}
            onChange={(e) => navigate({ from: e.target.value })}
            className={dateInput}
          />
          <span className="text-xs text-brand-textFaint">to</span>
          <input
            type="date"
            aria-label="To date"
            value={to}
            onChange={(e) => navigate({ to: e.target.value })}
            className={dateInput}
          />
        </div>
      )}
    </div>
  );
}

export function Topbar() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? APP_CONFIG.userName;
  const userImage = session?.user?.image ?? APP_CONFIG.userAvatar;

  return (
    <header className="flex justify-between items-center px-4 lg:px-8 py-4 lg:py-6 border-b border-brand-border/40 backdrop-blur-md bg-transparent z-20">
      <div className="flex items-center gap-2">
        <MobileMenuButton />
        <PeriodSelector />
      </div>

      <div className="flex items-center space-x-3 lg:space-x-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="User menu"
              className="flex items-center space-x-3 group rounded-md focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg focus-visible:outline-none"
            >
              <Image
                src={userImage}
                alt={userName}
                width={36}
                height={36}
                className="rounded-full object-cover border border-brand-border group-hover:border-brand-textMuted transition-colors duration-300"
              />
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[11px] text-brand-textFaint leading-none mb-0.5 group-hover:text-brand-textMuted transition-colors">
                  Signed in as
                </span>
                <span className="text-sm font-medium text-brand-textPrimary leading-none">
                  {userName}
                </span>
              </div>
              <ChevronDown
                size={14}
                className="hidden lg:block text-brand-textFaint group-hover:text-brand-textSecondary transition-colors duration-300"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-brand-border bg-brand-surface text-brand-textSecondary"
          >
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="cursor-pointer text-xs focus:bg-brand-elevated focus:text-brand-textPrimary"
            >
              <LogOut size={14} className="mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
