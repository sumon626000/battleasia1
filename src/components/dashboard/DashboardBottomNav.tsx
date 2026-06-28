import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Swords, Trophy, ShoppingBag, User as UserIcon } from "lucide-react";
import { useT } from "@/lib/i18n";

const BOTTOM = [
  { key: "dash.home", href: "/dashboard", icon: LayoutDashboard },
  { key: "dash.play", href: "/dashboard/matches", icon: Swords },
  { key: "dash.shop", href: "/dashboard/shop", icon: ShoppingBag },
  { key: "nav.leaderboard", href: "/feed/leaderboard", icon: Trophy, label: "Leaderboard" },
  { key: "dash.profile", href: "/dashboard/profile", icon: UserIcon },
] as const;

export function DashboardBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useT();
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
              <button
                type="button"
                onClick={() => navigate({ to: item.href })}
                className={`flex w-full flex-col items-center gap-0.5 py-2.5 font-hud text-[10px] font-semibold uppercase tracking-wide transition ${
                  active ? "text-gold" : "text-foreground/60 hover:text-gold"
                }`}
              >
                <Icon size={18} />
                <span>{t(item.key)}</span>
                {active && <span className="mt-0.5 h-0.5 w-6 bg-gold" />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
