import { useState } from "react";
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
  Gamepad2,
  Users2,
  UserX,
  ArrowLeft,
  Coins,
  Banknote,
  Settings2,
  Settings,
  Smartphone,
  FileText,
  Crown,
  Mail,
  ShieldAlert,
  History,
  Activity,
  Database,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: any };
type NavGroup = { label: string; icon: any; items: NavItem[] };

export const ADMIN_GROUPS: NavGroup[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Online Users", href: "/admin/online-users", icon: Activity },
      { label: "Login History", href: "/admin/login-history", icon: History },
    ],
  },
  {
    label: "Users",
    icon: Users,
    items: [
      { label: "All Users", href: "/admin/users", icon: Users },
      { label: "Deletion Requests", href: "/admin/account-deletions", icon: UserX },
      { label: "Premium", href: "/admin/premium", icon: Crown },
      { label: "Referral Config", href: "/admin/referral-config", icon: Users2 },
    ],
  },
  {
    label: "Esports",
    icon: Swords,
    items: [
      { label: "Games", href: "/admin/games", icon: Gamepad2 },
      { label: "Matches", href: "/admin/matches", icon: Swords },
      { label: "Results", href: "/admin/results", icon: Trophy },
      { label: "Participants", href: "/admin/participants", icon: Users2 },
    ],
  },
  {
    label: "Wallet",
    icon: Wallet,
    items: [
      { label: "Deposits", href: "/admin/deposits", icon: Wallet },
      { label: "Withdrawals", href: "/admin/withdrawals", icon: Wallet },
      { label: "Balances", href: "/admin/balances", icon: Wallet },
      { label: "Channels", href: "/admin/channels", icon: Banknote },
      { label: "Business Wallets", href: "/admin/business-wallets", icon: Wallet },
      { label: "Coin Rates", href: "/admin/coin-rates", icon: Coins },
      { label: "Withdraw Config", href: "/admin/withdraw-config", icon: Settings2 },
    ],
  },
  {
    label: "Shop",
    icon: ShoppingBag,
    items: [{ label: "Shop Items", href: "/admin/shop", icon: ShoppingBag }],
  },
  {
    label: "Content",
    icon: Newspaper,
    items: [
      { label: "Feed", href: "/admin/feed", icon: Newspaper },
      { label: "Pages", href: "/admin/pages", icon: FileText },
      { label: "Support", href: "/admin/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Comms",
    icon: Bell,
    items: [
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Push", href: "/admin/push", icon: Bell },
      { label: "SMTP / Email", href: "/admin/smtp", icon: Mail },
      { label: "Email Templates", href: "/admin/email-setup", icon: Mail },
      { label: "Templates", href: "/admin/templates", icon: Mail },
    ],
  },
  {
    label: "System",
    icon: Settings,
    items: [
      { label: "APK Manager", href: "/admin/apk", icon: Smartphone },
      { label: "Site Settings", href: "/admin/settings", icon: Settings },
      { label: "Security", href: "/admin/security", icon: ShieldAlert },
      { label: "Two-Factor", href: "/admin/two-factor", icon: ShieldAlert },
      { label: "Backups", href: "/admin/backups", icon: Database },
    ],
  },
];

// Flat list kept for backward-compat imports
export const ADMIN_NAV = ADMIN_GROUPS.flatMap((g) => g.items);

function useActive() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
}

function NavBody({ onNavigate }: { onNavigate?: () => void }) {
  const isActive = useActive();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const initiallyOpen = (g: NavGroup) => g.items.some((i) => isActive(i.href));
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADMIN_GROUPS.map((g) => [g.label, initiallyOpen(g)])),
  );

  return (
    <nav className="flex flex-col gap-1 p-3">
      {ADMIN_GROUPS.map((group) => {
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
                      <span className="uppercase">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div className="sr-only">{pathname}</div>
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-gold/30 bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded border border-border/60 p-1.5 text-foreground/80 hover:border-gold hover:text-gold"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <Shield className="h-5 w-5 text-gold shrink-0" />
            <span className="truncate font-display text-base sm:text-lg uppercase tracking-[0.2em] text-gold">
              Command Center
            </span>
          </div>
          <Link
            to="/dashboard"
            className="flex shrink-0 items-center gap-2 rounded border border-border/70 px-2.5 py-1.5 font-hud text-[11px] sm:text-xs uppercase tracking-widest text-foreground/70 hover:border-gold hover:text-gold"
          >
            <ArrowLeft size={14} /> Exit
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-card/40 lg:block">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <NavBody />
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 max-w-[85%] overflow-y-auto border-r border-gold/30 bg-card shadow-2xl">
              <div className="flex h-14 items-center justify-between border-b border-border/60 px-3">
                <span className="font-display text-sm uppercase tracking-[0.2em] text-gold">
                  Admin Menu
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded border border-border/60 p-1.5 text-foreground/80 hover:border-gold hover:text-gold"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>
              <NavBody onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
