import {
  Home,
  TrendingUp,
  Trophy,
  Users,
  Tag,
  Settings,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  managerOnly?: boolean;
};

export const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Closer KPIs", href: "/closer-kpis", icon: TrendingUp },
  { name: "Setter KPIs", href: "/setter-kpis", icon: TrendingUp },
  { name: "Funnel", href: "/funnel", icon: GitBranch, managerOnly: true },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Rep Management", href: "/rep-management", icon: Users, managerOnly: true },
  { name: "Offers", href: "/offers", icon: Tag, managerOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, managerOnly: true },
];

/** Manager-only route prefixes for middleware checking */
export const MANAGER_ONLY_ROUTES = navItems
  .filter((i) => i.managerOnly)
  .map((i) => i.href);
