import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Swords,
  Wallet,
  Trophy,
  ShoppingBag,
  Users,
  Bell,
  LifeBuoy,
  Newspaper,
  User as UserIcon,
  Crown,
  Settings,
  BarChart3,
} from "lucide-react";

export const DASH_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Play Matches", href: "/dashboard/matches", icon: Swords },
  { label: "My Matches", href: "/dashboard/my-matches", icon: Trophy },
  { label: "My Statistics", href: "/dashboard/statistics", icon: BarChart3 },
  { label: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { label: "Shop", href: "/dashboard/shop", icon: ShoppingBag },
  { label: "Referrals", href: "/dashboard/referrals", icon: Users },
  { label: "Premium", href: "/dashboard/premium", icon: Crown },
  { label: "News & Feed", href: "/dashboard/feed", icon: Newspaper },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

export function DashboardSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/70 bg-card/40 lg:block">
      <nav className="sticky top-20 flex flex-col gap-1 p-3">
        {DASH_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`group flex items-center gap-3 rounded-md border px-3 py-2 font-hud text-sm font-semibold tracking-wide transition ${
                active
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-transparent text-foreground/75 hover:border-border hover:bg-secondary/60 hover:text-gold"
              }`}
            >
              <Icon size={16} className={active ? "text-gold" : "text-foreground/60 group-hover:text-gold"} />
              <span className="uppercase">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
