import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import logoShield from "@/assets/logo-shield.webp";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { ViewModeToggle } from "@/components/site/ViewModeToggle";

import { useT } from "@/lib/i18n";

const NAV_KEYS: { key: string; href: string; label?: string }[] = [
  { key: "nav.home", href: "/" },
  { key: "nav.matches", href: "/matches" },
  { key: "nav.leaderboard", href: "/leaderboard" },
  { key: "nav.feed", href: "/feed", label: "Feed" },
  { key: "nav.shop", href: "/shop" },
  { key: "nav.premium", href: "/premium" },
  { key: "nav.news", href: "/news" },
  { key: "nav.about", href: "/about" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const userBadge = user?.email?.split("@")[0]?.toUpperCase() ?? t("common.player");

  return (
    <header className="border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <img loading="eager" decoding="async" src={logoShield} alt="Battle Asia" width={112} height={112} className="h-24 w-24 object-contain drop-shadow-[0_0_18px_rgba(255,176,32,0.5)] transition group-hover:drop-shadow-[0_0_28px_rgba(255,176,32,0.7)] sm:h-28 sm:w-28" />

          <span className="font-display text-xl font-bold leading-none tracking-wide">
            <span className="block">BATTLE</span>
            <span className="block text-gold">ASIA</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_KEYS.map((n) => (
            <a key={n.key} href={n.href} className="font-hud text-sm font-semibold text-foreground/75 transition hover:text-gold">
              {t(n.key)}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          
          <LanguageSwitcher />
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-1.5 transition hover:border-gold/60 hover:text-gold">
                <UserIcon size={14} className="text-gold" />
                <span className="font-hud text-xs font-semibold tracking-wide">{userBadge}</span>
              </Link>
              <Link to="/dashboard" className="btn-gold px-4 py-2 text-sm">{t("auth.dashboard")}</Link>
              <button onClick={signOut} className="btn-outline-gold px-3 py-2 text-sm" aria-label="Sign out">
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn-outline-gold px-5 py-2 text-sm">{t("auth.login")}</Link>
              <Link to="/auth" className="btn-gold px-5 py-2 text-sm">{t("auth.register")}</Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          
          <LanguageSwitcher compact />
          {isAuthenticated && (
            <button
              onClick={signOut}
              className="grid h-9 w-9 place-items-center rounded-md border border-border/70 text-foreground/75 transition hover:border-destructive/60 hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
          <button onClick={() => setOpen(!open)} className="rounded-md p-2 text-gold" aria-label="Toggle menu">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-card lg:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {NAV_KEYS.map((n) => (
              <a key={n.key} href={n.href} className="font-hud rounded px-2 py-2 text-sm font-semibold hover:bg-secondary hover:text-gold">
                {t(n.key)}
              </a>
            ))}
            {isAuthenticated ? (
              <div className="mt-2 grid grid-cols-1 gap-2">
                <Link to="/dashboard" className="btn-gold py-2 text-center text-sm">{t("auth.dashboard")}</Link>
                <button onClick={signOut} className="btn-outline-gold py-2 text-center text-sm">{t("auth.logout")}</button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/auth" className="btn-outline-gold py-2 text-center text-sm">{t("auth.login")}</Link>
                <Link to="/auth" className="btn-gold py-2 text-center text-sm">{t("auth.register")}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
