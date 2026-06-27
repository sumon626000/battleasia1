import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
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
  ChevronDown,
  Gamepad2,
  Wallet,
  UserCircle,
  Megaphone,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useIsAdmin } from "@/hooks/use-is-admin";

type DashItem = { key: string; href: string; icon: any };
type DashGroup = { label: string; icon: any; items: DashItem[] };

export const DASH_GROUPS: DashGroup[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { key: "dash.overview", href: "/dashboard", icon: LayoutDashboard },
      { key: "dash.statistics", href: "/dashboard/statistics", icon: BarChart3 },
    ],
  },
  {
    label: "Esports",
    icon: Gamepad2,
    items: [
      { key: "dash.playMatches", href: "/dashboard/matches", icon: Swords },
      { key: "dash.matches", href: "/dashboard/my-matches", icon: Trophy },
    ],
  },
  {
    label: "Wallet & Shop",
    icon: Wallet,
    items: [
      { key: "dash.vault", href: "/dashboard/vault", icon: Vault },
      { key: "dash.shop", href: "/dashboard/shop", icon: ShoppingBag },
      { key: "dash.premium", href: "/dashboard/premium", icon: Crown },
    ],
  },
  {
    label: "Social",
    icon: Megaphone,
    items: [
      { key: "dash.socialFeed", href: "/feed", icon: Newspaper },
      { key: "dash.newPost", href: "/feed/new", icon: ShoppingBag },
      { key: "dash.newStory", href: "/dashboard/story/new", icon: Crown },
      { key: "dash.feed", href: "/dashboard/feed", icon: Newspaper },
      { key: "dash.messages", href: "/dashboard/messages", icon: MessageSquare },
      { key: "dash.referrals", href: "/dashboard/referrals", icon: Users },
    ],
  },
  {
    label: "Account",
    icon: UserCircle,
    items: [
      { key: "dash.profile", href: "/dashboard/profile", icon: UserIcon },
      { key: "dash.notifications", href: "/dashboard/notifications", icon: Bell },
      { key: "dash.support", href: "/dashboard/support", icon: LifeBuoy },
      { key: "dash.settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

// Backward-compat flat list
export const DASH_NAV = DASH_GROUPS.flatMap((g) => g.items);

function useActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export function DashNavBody({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useActive();
  const { t } = useT();
  const isAdmin = useIsAdmin();
  const initiallyOpen = (g: DashGroup) => g.items.some((i) => isActive(i.href));
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DASH_GROUPS.map((g) => [g.label, initiallyOpen(g)])),
  );

  return (
    <nav className="flex flex-col gap-1 p-3">
      <Link
        to="/"
        onClick={onNavigate}
        className="group mb-1 flex items-center gap-2 rounded-md border border-transparent px-3 py-2 font-hud text-xs font-bold uppercase tracking-widest text-foreground/75 transition hover:border-border hover:bg-secondary/60 hover:text-gold"
      >
        <Home size={14} className="text-foreground/60 group-hover:text-gold" />
        <span>Back to Home</span>
      </Link>

      {DASH_GROUPS.map((group) => {
        const Gicon = group.icon;
        const isOpen = open[group.label] ?? false;
        const hasActive = group.items.some((i) => isActive(i.href));
        return (
          <div key={group.label} className="mb-1">
            <button
              type="button"
              onClick={() => setOpen((p) => ({ ...p, [group.label]: !p[group.label] }))}
              className={`group flex w-full items-center gap-2 rounded-md border px-3 py-2 font-hud text-xs font-bold uppercase tracking-widest transition ${
                hasActive
                  ? "border-gold/50 bg-gold/5 text-gold"
                  : "border-transparent text-foreground/80 hover:border-border hover:bg-secondary/60 hover:text-gold"
              }`}
            >
              <Gicon size={14} />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="mt-1 ml-2 flex flex-col gap-0.5 border-l border-border/50 pl-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavigate}
                      className={`flex items-center gap-2 rounded px-3 py-1.5 font-hud text-[12px] tracking-wide transition ${
                        active
                          ? "bg-gold/15 text-gold"
                          : "text-foreground/70 hover:bg-secondary/50 hover:text-gold"
                      }`}
                    >
                      <Icon size={13} />
                      <span className="uppercase">{t(item.key)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {isAdmin && (
        <Link
          to="/admin"
          onClick={onNavigate}
          className="mt-2 flex items-center gap-2 rounded-md border border-gold/40 bg-gold/5 px-3 py-2 font-hud text-xs font-bold uppercase tracking-widest text-gold transition hover:border-gold hover:bg-gold/10"
        >
          <ShieldCheck size={14} />
          <span>Go Admin</span>
        </Link>
      )}
    </nav>
  );
}

export function DashboardSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/70 bg-card/40 lg:block">
      <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
        <DashNavBody />
      </div>
    </aside>
  );
}
