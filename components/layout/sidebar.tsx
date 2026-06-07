"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/nav-config";

// Bottom left wavy graphic - with infinite flow animation using gold/bronze
function WavyGraphic() {
  return (
    <svg
      viewBox="0 0 100 50"
      className="absolute bottom-0 left-0 w-full h-24 opacity-60 pointer-events-none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="waveGrad1" x1="0" y1="0" x2="100%" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="waveGrad2" x1="0" y1="0" x2="100%" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="70%" stopColor="#A9744F" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="animate-[waveFlow_10s_linear_infinite]">
        <path
          d="M-100,40 Q-75,20 -50,40 T0,40 Q25,20 50,40 T100,40 Q125,20 150,40 T200,40"
          fill="none"
          stroke="url(#waveGrad1)"
          strokeWidth="0.5"
        />
      </g>
      <g className="animate-[waveFlow_15s_linear_infinite_reverse]">
        <path
          d="M-100,45 Q-70,25 -40,45 T0,45 Q30,25 60,45 T100,45 Q130,25 160,45 T200,45"
          fill="none"
          stroke="url(#waveGrad2)"
          strokeWidth="0.5"
        />
      </g>
      <g className="animate-[waveFlow_12s_linear_infinite]">
        <path
          d="M-100,50 Q-60,30 -30,50 T0,50 Q40,30 70,50 T100,50 Q140,30 170,50 T200,50"
          fill="none"
          stroke="url(#waveGrad1)"
          strokeWidth="0.5"
          opacity="0.5"
        />
      </g>
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] flex flex-col border-r border-brand-border/40 bg-brand-bg z-20 shrink-0">
      <div className="p-6 pb-8">
        <div className="text-xl font-medium tracking-tight flex items-center cursor-default">
          <span className="font-semibold text-brand-textPrimary">Sales.io</span>
          <span className="text-brand-textFaint font-light ml-1">OS</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
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
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-colors duration-300 group relative focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg focus-visible:outline-none ${
                isActive
                  ? "bg-brand-elevated text-brand-textPrimary font-medium"
                  : "text-brand-textMuted hover:bg-white/[0.03] hover:text-brand-textSecondary"
              }`}
              style={{ animation: `slideUpFade 0.4s ease-out ${index * 0.05}s both` }}
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
      </nav>

      {/* Bottom OS Card */}
      <div className="p-4 mt-auto animate-stagger-4">
        <div className="relative h-28 rounded-xl bg-gradient-to-b from-brand-surface to-brand-bg gradient-border-card overflow-hidden flex flex-col justify-center px-5 group cursor-default transition-colors duration-500">
          <h4 className="text-[13px] font-medium text-brand-textPrimary mb-1 z-10 group-hover:text-brand-accent transition-colors">
            Sales.io OS
          </h4>
          <p className="text-[11px] text-brand-textFaint leading-tight z-10 transition-colors group-hover:text-brand-textMuted">
            High Ticket Sales
            <br />
            Operating System
          </p>
          <WavyGraphic />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none mix-blend-screen"></div>
        </div>
      </div>
    </aside>
  );
}
