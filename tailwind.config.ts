import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // ── SalesIO OS brand palette (black + silver + gold) ─────
        brand: {
          bg: "#0A0A0B", // page background (near-black, neutral)
          surface: "#141517", // sidebar / topbar / card background
          elevated: "#1F2024", // active nav, hovers, elevated panels
          border: "#26272B", // borders (neutral silver-grey)
          accent: "#F59E0B", // single accent (gold) — CTAs, charts, focus
          teal: "#00E5C4", // secondary accent — sync CTAs, offers
          purple: "#A855F7", // tertiary accent — DM setter icons
          textPrimary: "#FFFFFF",
          textSecondary: "#D4D4D8", // lighter muted text (neutral-300 equiv)
          textMuted: "#A1A1AA", // neutral silver-grey
          textFaint: "#8B8B95", // muted but readable (boosted from #71717A for contrast)
          negative: "#EF4444", // down-trend delta arrows, errors
          positive: "#22C55E", // up-trend delta arrows
          // leaderboard medals
          gold: "#F59E0B", // rank 1
          silver: "#C0C5CE", // rank 2
          bronze: "#A9744F", // rank 3
          // card/icon backgrounds
          iconBg: "#0D1117", // icon container background
          colHeader: "#8B9AB3", // table column header text
        },
        // ── shadcn/ui semantic tokens (mapped to brand via CSS vars)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
