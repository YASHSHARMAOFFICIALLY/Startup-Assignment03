"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar, ChevronDown, LogOut, Layers } from "lucide-react";
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
          <button className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md bg-transparent text-xs text-brand-textFaint hover:text-brand-textSecondary hover:bg-white/[0.03] transition-colors duration-200 focus-visible:ring-1 focus-visible:ring-brand-accent focus-visible:outline-none">
            <Calendar size={13} className="opacity-40" />
            <span>{label}</span>
            <ChevronDown size={12} className="opacity-30" />
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

function OfferSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [offers, setOffers] = useState<{ id: string; name: string }[]>([]);

  const currentOfferId = searchParams.get("offerId") || "";

  const loadOffers = useCallback(async () => {
    try {
      const res = await fetch("/api/offers", { cache: "no-store" });
      if (res.ok) setOffers(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  // Don't render if 0 or 1 offer (no choice to make)
  if (offers.length <= 1) return null;

  function navigate(offerId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (offerId) params.set("offerId", offerId);
    else params.delete("offerId");
    router.push(`${pathname}?${params.toString()}`);
  }

  const label = currentOfferId
    ? offers.find((o) => o.id === currentOfferId)?.name ?? "Offer"
    : "All Offers";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md bg-transparent text-xs text-brand-textFaint hover:text-brand-textSecondary hover:bg-white/[0.03] transition-colors duration-200 focus-visible:ring-1 focus-visible:ring-brand-accent focus-visible:outline-none">
          <Layers size={13} className="opacity-40" />
          <span>{label}</span>
          <ChevronDown size={12} className="opacity-30" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="border-brand-border bg-brand-surface text-brand-textSecondary"
      >
        <DropdownMenuItem
          onClick={() => navigate("")}
          className={`cursor-pointer text-xs focus:bg-brand-elevated focus:text-brand-textPrimary ${!currentOfferId ? "text-brand-textPrimary" : ""}`}
        >
          All Offers
        </DropdownMenuItem>
        {offers.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onClick={() => navigate(o.id)}
            className={`cursor-pointer text-xs focus:bg-brand-elevated focus:text-brand-textPrimary ${currentOfferId === o.id ? "text-brand-textPrimary" : ""}`}
          >
            {o.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? APP_CONFIG.userName;
  const userImage = session?.user?.image ?? APP_CONFIG.userAvatar;

  return (
    <header className="flex justify-between items-center px-4 lg:px-8 py-3 lg:py-4 border-b border-white/[0.03] bg-transparent z-20">
      <div className="flex items-center gap-2">
        <MobileMenuButton />
        <OfferSelector />
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
                width={28}
                height={28}
                className="rounded-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-200"
              />
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-[11px] text-brand-textFaint leading-none">
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
