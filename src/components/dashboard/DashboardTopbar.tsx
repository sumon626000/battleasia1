import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, Wallet as WalletIcon, LogOut, Crown, Menu } from "lucide-react";
import { toast } from "sonner";
import logoShield from "@/assets/logo-shield.webp";
import { CoinIcon } from "@/components/site/CoinIcon";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/use-notifications";
import type { Profile } from "@/hooks/use-profile";
import { ViewModeToggle } from "@/components/site/ViewModeToggle";


interface Props {
  profile: Profile | null;
  onOpenMobileNav: () => void;
}

export function DashboardTopbar({ profile, onOpenMobileNav }: Props) {
  const navigate = useNavigate();
  const { unread } = useNotifications();
  const username = profile?.in_game_username || profile?.username || "PLAYER";
  const initials = username.slice(0, 2).toUpperCase();
  const balance = Number(profile?.bac_coin_balance ?? 0);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMobileNav}
            className="rounded-md p-2 text-gold lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img loading="lazy" decoding="async" src={logoShield} alt="Battle Asia" width={28} height={28} className="h-7 w-7" />
            <span className="hidden font-display text-lg font-bold leading-none tracking-wide sm:inline">
              BATTLE<span className="text-gold">ASIA</span>
            </span>
          </Link>
        </div>

        <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-3">
          <div className="hud-panel flex items-center gap-2.5 px-3.5 py-2">
            <CoinIcon size={24} />
            <span className="font-mono text-base font-bold tabular-nums text-gold sm:text-lg">
              {balance.toLocaleString()}
            </span>
            <span className="hidden font-hud text-[11px] font-semibold text-foreground/70 sm:inline">BAC</span>
          </div>
          <Link
            to="/dashboard/vault"
            className="hud-panel hidden items-center gap-2 px-3 py-1.5 transition hover:text-gold sm:flex"
          >
            <WalletIcon size={14} />
            <span className="font-hud text-[11px] font-semibold uppercase">Vault</span>
          </Link>
          {profile?.is_premium && (
            <div className="hud-panel hidden items-center gap-1.5 border-gold/50 px-2.5 py-1.5 text-gold sm:flex">
              <Crown size={12} />
              <span className="font-hud text-[10px] font-bold">PREMIUM</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          
          <Link
            to="/dashboard/notifications"
            className="relative grid h-9 w-9 place-items-center rounded-md border border-border/70 text-foreground/75 transition hover:border-gold/60 hover:text-gold"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 font-mono text-[9px] font-bold leading-none text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <Link
            to="/dashboard/profile"
            className="hidden items-center gap-2 rounded-md border border-border/70 bg-background/60 px-2 py-1 transition hover:border-gold/60 lg:flex"
          >
            {profile?.avatar_url ? (
              <img loading="lazy" decoding="async" src={profile.avatar_url} alt="" className="h-7 w-7 rounded-sm object-cover" />
            ) : (
              <div className="grid h-7 w-7 place-items-center rounded-sm bg-gold/20 font-mono text-[11px] font-bold text-gold">
                {initials}
              </div>
            )}
            <span className="font-hud text-xs font-semibold uppercase tracking-wide">
              {username}
            </span>
          </Link>
          <button
            onClick={signOut}
            className="grid h-9 w-9 place-items-center rounded-md border border-border/70 text-foreground/75 transition hover:border-destructive/60 hover:text-destructive"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
