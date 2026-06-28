import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Swords,
  Vault,
  ShoppingBag,
  Newspaper,
  Users,
  ChevronDown,
  Trophy,
  Crown,
  MessageSquare,
  User as UserIcon,
  Bell,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Home as HomeIcon,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";

const PRIMARY = [
  { label: "Home", href: "/dashboard", icon: Home, exact: true },
  { label: "Matches", href: "/dashboard/matches", icon: Swords },
  { label: "Vault", href: "/dashboard/vault", icon: Vault },
  { label: "Shop", href: "/dashboard/shop", icon: ShoppingBag },
  { label: "Feed", href: "/feed", icon: Newspaper },
  { label: "Referrals", href: "/dashboard/referrals", icon: Users },
] as const;

const MORE = [
  { label: "My Matches", href: "/dashboard/my-matches", icon: Trophy },
  { label: "Premium", href: "/dashboard/premium", icon: Crown },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

export function DashboardHeaderNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/") || pathname === href;

  const moreActive = MORE.some((m) => isActive(m.href));

  return (
    <div className="hidden border-b border-border/60 bg-background/70 backdrop-blur lg:block">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-5 py-2">
        <Link
          to="/"
          className="mr-2 flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 font-hud text-[11px] font-bold uppercase tracking-widest text-foreground/70 transition hover:border-border hover:bg-secondary/60 hover:text-gold"
        >
          <HomeIcon size={13} />
          <span>Site</span>
        </Link>

        <div className="mx-1 h-5 w-px bg-border/70" />

        {PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-hud text-[11px] font-bold uppercase tracking-widest transition ${
                active
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-transparent text-foreground/80 hover:border-border hover:bg-secondary/60 hover:text-gold"
              }`}
            >
              <Icon size={13} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div ref={wrapRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-hud text-[11px] font-bold uppercase tracking-widest transition ${
              moreActive || open
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-transparent text-foreground/80 hover:border-border hover:bg-secondary/60 hover:text-gold"
            }`}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span>More</span>
            <ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-md border border-border/70 bg-background/95 shadow-xl backdrop-blur"
            >
              {MORE.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-2 px-3 py-2 font-hud text-[11px] font-bold uppercase tracking-widest transition ${
                      active
                        ? "bg-gold/10 text-gold"
                        : "text-foreground/85 hover:bg-secondary/70 hover:text-gold"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 border-t border-border/70 bg-gold/5 px-3 py-2 font-hud text-[11px] font-bold uppercase tracking-widest text-gold transition hover:bg-gold/10"
                >
                  <ShieldCheck size={13} />
                  <span>Go Admin</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <Link
            to="/admin"
            className="ml-auto flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/5 px-3 py-1.5 font-hud text-[11px] font-bold uppercase tracking-widest text-gold transition hover:border-gold hover:bg-gold/10"
          >
            <ShieldCheck size={13} />
            <span>Admin</span>
          </Link>
        )}
      </div>
    </div>
  );
}
