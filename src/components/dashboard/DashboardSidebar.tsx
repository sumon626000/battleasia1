import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Home,
  Swords,
  Vault,
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
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";

export const DASH_NAV = [
  { key: "dash.overview", href: "/dashboard", icon: LayoutDashboard },
  { key: "dash.playMatches", href: "/dashboard/matches", icon: Swords },
  { key: "dash.matches", href: "/dashboard/my-matches", icon: Trophy },
  { key: "dash.statistics", href: "/dashboard/statistics", icon: BarChart3 },
  { key: "dash.shop", href: "/dashboard/shop", icon: ShoppingBag },
  { key: "dash.vault", href: "/dashboard/vault", icon: Vault },
  { key: "dash.referrals", href: "/dashboard/referrals", icon: Users },
  { key: "dash.premium", href: "/dashboard/premium", icon: Crown },
  { key: "dash.feed", href: "/dashboard/feed", icon: Newspaper },
  { key: "dash.messages", href: "/dashboard/messages", icon: MessageSquare },
  { key: "dash.notifications", href: "/dashboard/notifications", icon: Bell },
  { key: "dash.support", href: "/dashboard/support", icon: LifeBuoy },
  { key: "dash.profile", href: "/dashboard/profile", icon: UserIcon },
  { key: "dash.settings", href: "/dashboard/settings", icon: Settings },
] as const;

export function DashboardSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useT();
  const isAdmin = useIsAdmin();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/70 bg-card/40 lg:block">
      <nav className="sticky top-20 flex flex-col gap-1 p-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="group flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left font-hud text-sm font-semibold tracking-wide text-foreground/75 transition hover:border-border hover:bg-secondary/60 hover:text-gold"
        >
          <Home size={16} className="text-foreground/60 group-hover:text-gold" />
          <span className="uppercase">Back to Home</span>
        </button>
        {DASH_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate({ to: item.href })}
              className={`group flex items-center gap-3 rounded-md border px-3 py-2 text-left font-hud text-sm font-semibold tracking-wide transition ${
                active
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-transparent text-foreground/75 hover:border-border hover:bg-secondary/60 hover:text-gold"
              }`}
            >
              <Icon size={16} className={active ? "text-gold" : "text-foreground/60 group-hover:text-gold"} />
              <span className="uppercase">{t(item.key)}</span>
            </button>
          );
        })}
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate({ to: "/admin" })}
            className="group mt-2 flex items-center gap-3 rounded-md border border-gold/40 bg-gold/5 px-3 py-2 text-left font-hud text-sm font-semibold uppercase tracking-wide text-gold transition hover:border-gold hover:bg-gold/10"
          >
            <ShieldCheck size={16} />
            <span>Go Admin</span>
          </button>
        )}
      </nav>
    </aside>
  );
}
