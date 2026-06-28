import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Film, ShoppingBag, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export function FeedBottomNav() {
  const { user, profile, isAuthenticated } = useAuth() as any;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const username = profile?.username || profile?.full_name || user?.email?.split("@")[0];

  const items: any[] = [
    { key: "home", label: "Home", icon: Home, to: "/feed", active: pathname === "/feed" },
    { key: "leaderboard", label: "Leaderboard", icon: Search, to: "/feed/leaderboard", active: pathname.startsWith("/feed/leaderboard") || pathname.startsWith("/leaderboard") },
    { key: "reels", label: "Reels", icon: Film, to: "/feed", active: false, onClick: () => toast.info("Reels coming soon") },
    { key: "shop", label: "Shop", icon: ShoppingBag, to: "/shop", active: pathname.startsWith("/shop") },
    isAuthenticated && username
      ? { key: "profile", label: "Profile", icon: UserIcon, to: "/u/$username", params: { username }, active: pathname.startsWith("/u/") }
      : { key: "profile", label: "Profile", icon: UserIcon, to: "/auth", active: pathname.startsWith("/auth") },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Feed navigation"
    >
      <ul className="mx-auto flex max-w-[600px] items-center justify-around px-2 py-2">
        {items.map((it: any) => {
          const Icon = it.icon;
          const cls = `flex flex-col items-center gap-0.5 rounded-md px-3 py-1.5 font-hud text-[9px] uppercase tracking-wider transition ${
            it.active ? "text-gold" : "text-foreground/70 hover:text-gold"
          }`;
          if (it.onClick) {
            return (
              <li key={it.key}>
                <button onClick={it.onClick} className={cls} aria-label={it.label}>
                  <Icon size={24} strokeWidth={it.active ? 2.5 : 2} fill={it.active ? "currentColor" : "none"} />
                </button>
              </li>
            );
          }
          return (
            <li key={it.key}>
              <Link to={it.to} params={it.params} className={cls} aria-label={it.label}>
                <Icon size={24} strokeWidth={it.active ? 2.5 : 2} fill={it.active ? "currentColor" : "none"} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
