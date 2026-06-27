import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Swords, Wallet, ShoppingBag, User as UserIcon } from "lucide-react";

const BOTTOM = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Play", href: "/dashboard/matches", icon: Swords },
  { label: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { label: "Shop", href: "/dashboard/shop", icon: ShoppingBag },
  { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
] as const;

export function DashboardBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-xl lg:hidden">
      <ul className="grid grid-cols-5">
        {BOTTOM.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                to={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 font-hud text-[10px] font-semibold uppercase tracking-wide transition ${
                  active ? "text-gold" : "text-foreground/60 hover:text-gold"
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {active && <span className="mt-0.5 h-0.5 w-6 bg-gold" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
