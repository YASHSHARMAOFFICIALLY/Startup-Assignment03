import {
  Home,
  TrendingUp,
  Trophy,
  Users,
  Tag,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { name: string; href: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Closer KPIs", href: "/closer-kpis", icon: TrendingUp },
  { name: "Setter KPIs", href: "/setter-kpis", icon: TrendingUp },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Rep Management", href: "/rep-management", icon: Users },
  { name: "Offers", href: "/offers", icon: Tag },
  { name: "Settings", href: "/settings", icon: Settings },
];
