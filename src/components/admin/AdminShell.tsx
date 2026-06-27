import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Swords,
  Trophy,
  ShoppingBag,
  Wallet,
  Newspaper,
  Bell,
  LifeBuoy,
  Shield,
  Settings,
  ArrowLeft,
} from "lucide-react";

export const ADMIN_NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Roles", href: "/admin/roles", icon: Shield },
  { label: "Matches", href: "/admin/matches", icon: Swords },
  { label: "Results", href: "/admin/results", icon: Trophy },
  { label: "Shop", href: "/admin/shop", icon: ShoppingBag },
  { label: "Deposits", href: "/admin/deposits", icon: Wallet },
  { label: "Withdrawals", href: "/admin/withdrawals", icon: Wallet },
  { label: "Feed", href: "/admin/feed", icon: Newspaper },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "Settings", href: "/admin/settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-gold" />
            <span className="font-display text-lg uppercase tracking-[0.2em] text-gold">
              Command Center
            </span>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded border border-border/70 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-foreground/70 hover:border-gold hover:text-gold"
          >
            <ArrowLeft size={14} /> Exit
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden w-60 shrink-0 border-r border-border/70 bg-card/40 lg:block">
          <nav className="sticky top-14 flex flex-col gap-1 p-3">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
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
                  <Icon size={16} />
                  <span className="uppercase">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-6">
          <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto pb-2">
            {ADMIN_NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`shrink-0 rounded border px-3 py-1.5 font-hud text-[11px] uppercase tracking-widest ${
                    active
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-border/60 text-foreground/70"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
