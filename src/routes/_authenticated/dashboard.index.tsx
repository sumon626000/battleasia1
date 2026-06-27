import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import {
  Trophy,
  Swords,
  Users,
  TrendingUp,
  Wallet as WalletIcon,
  ShoppingBag,
  Crown,
  ArrowRight,
} from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import squadHero from "@/assets/pubg-squad-action.jpg";
import sniperImg from "@/assets/pubg-sniper-rooftop.jpg";
import vehicleImg from "@/assets/pubg-vehicle-chase.jpg";
import airdropImg from "@/assets/pubg-airdrop.jpg";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [{ title: "Dashboard — Battle Asia" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const name = profile?.in_game_username || profile?.username || "Player";
  const balance = Number(profile?.bac_coin_balance ?? 0);

  const stats: Array<{ label: string; value: string; icon: any; accent?: boolean; isCoin?: boolean }> = [
    { label: "BAC Balance", value: balance.toLocaleString(), icon: null, accent: true, isCoin: true },
    { label: "Matches Played", value: "0", icon: Swords },
    { label: "Wins", value: "0", icon: Trophy },
    { label: "Referrals", value: "0", icon: Users },
  ];

  const quick = [
    { label: "Join Match", href: "/dashboard/matches", icon: Swords },
    { label: "Get BAC Coin", href: "/dashboard/vault", icon: WalletIcon },
    { label: "Shop", href: "/dashboard/shop", icon: ShoppingBag },
    { label: "Go Premium", href: "/dashboard/premium", icon: Crown },
  ];

  return (
    <div className="space-y-5">
      <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${squadHero})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/80 to-background/40"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-hud opacity-20" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-hud text-xs uppercase tracking-[0.25em] text-gold/80">
              Welcome back, Operator
            </p>
            <h1 className="mt-1 truncate font-display text-2xl font-bold tracking-wide sm:text-3xl">
              {name}
            </h1>
            <p className="mt-1 font-mono text-[11px] text-foreground/60">
              PUBG ID: {profile?.pubg_id ?? "—"} · Server: {profile?.game_server ?? "—"}
            </p>
          </div>
          <div className="hidden sm:block">
            <TrendingUp className="h-12 w-12 text-gold/60" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`hud-panel p-3 sm:p-4 ${s.accent ? "border-gold/40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">
                  {s.label}
                </span>
                {s.isCoin ? <CoinIcon size={16} /> : <Icon size={14} className={s.accent ? "text-gold" : "text-foreground/50"} />}
              </div>
              <div className={`mt-2 font-mono text-xl font-bold tabular-nums sm:text-2xl ${s.accent ? "text-gold" : ""}`}>
                {s.value}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2 className="mb-3 font-hud text-sm font-bold uppercase tracking-widest text-foreground/80">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quick.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                to={q.href}
                className="hud-panel group flex items-center justify-between p-4 transition hover:border-gold/60 hover:bg-gold/5"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-gold/15 text-gold">
                    <Icon size={16} />
                  </div>
                  <span className="font-hud text-sm font-semibold uppercase">{q.label}</span>
                </div>
                <ArrowRight size={14} className="text-foreground/40 transition group-hover:text-gold" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="hud-panel relative overflow-hidden p-5">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${vehicleImg})` }}
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-transparent" />
          <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">
            Upcoming Matches
          </h3>
          <p className="mt-2 font-mono text-xs text-foreground/70">
            No upcoming matches yet. Check the Play Matches page.
          </p>
        </div>
        <div className="hud-panel relative overflow-hidden p-5">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${sniperImg})` }}
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-transparent" />
          <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">
            Recent Activity
          </h3>
          <p className="mt-2 font-mono text-xs text-foreground/70">
            Your wallet and match history will appear here.
          </p>
        </div>
      </section>

      <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${airdropImg})` }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="max-w-md">
          <p className="font-hud text-[10px] uppercase tracking-[0.3em] text-gold/80">Drop Zone</p>
          <h3 className="mt-1 font-display text-xl font-bold uppercase tracking-wide">
            Claim Your Loot
          </h3>
          <p className="mt-2 font-mono text-xs text-foreground/70">
            Top up BAC Coin, join tournaments, and climb the leaderboard.
          </p>
        </div>
      </section>
    </div>
  );
}