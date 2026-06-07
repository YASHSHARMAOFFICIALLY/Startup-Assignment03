"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { navItems } from "@/lib/nav-config";

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Prevent background scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 text-brand-textMuted hover:text-brand-textPrimary transition-colors rounded-md focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg focus-visible:outline-none"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <nav
            id="mobile-nav-drawer"
            className="absolute left-0 top-0 bottom-0 w-[280px] bg-brand-bg border-r border-brand-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4">
              <div className="text-xl font-medium tracking-tight flex items-center">
                <span className="font-semibold text-brand-textPrimary">Sales.io</span>
                <span className="text-brand-textFaint font-light ml-1">OS</span>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="p-2 text-brand-textMuted hover:text-brand-textPrimary transition-colors rounded-md focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:outline-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav items */}
            <div className="flex-1 px-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-colors group ${
                      isActive
                        ? "bg-brand-elevated text-brand-textPrimary font-medium"
                        : "text-brand-textMuted hover:bg-white/[0.03] hover:text-brand-textSecondary"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`${
                        isActive
                          ? "text-brand-textPrimary"
                          : "text-brand-textFaint group-hover:text-brand-textMuted"
                      } stroke-[1.5] transition-colors`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
