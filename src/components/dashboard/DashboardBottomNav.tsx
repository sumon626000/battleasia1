import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Swords, Trophy, Users, User as UserIcon } from "lucide-react";
import { useT } from "@/lib/i18n";

const BOTTOM = [
  { key: "dash.home", href: "/dashboard", icon: LayoutDashboard },
  { key: "dash.play", href: "/dashboard/matches", icon: Swords },
  { key: "nav.social", href: "/feed", icon: Users, label: "Social" },
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
              : item.href === "/feed"
                ? pathname === "/feed" || pathname.startsWith("/feed/") && !pathname.startsWith("/feed/leaderboard")
                : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => navigate({ to: item.href })}
                className={`relative flex w-full flex-col items-center gap-1 py-2.5 font-hud text-[10px] font-semibold uppercase tracking-wide transition ${
                  active ? "text-gold" : "text-foreground/60 hover:text-gold"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-[2px] rounded-b-full bg-gold shadow-[0_0_10px_2px_rgba(212,175,55,0.6)]"
                  />
                )}
                <span
                  className={`grid place-items-center rounded-md p-1 transition ${
                    active ? "bg-gold/15" : ""
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span>{(item as any).label ?? t(item.key)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
