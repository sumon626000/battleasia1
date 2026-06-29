import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CoinIcon } from "@/components/site/CoinIcon";
import { TrendingUp, Wallet, Calendar, CalendarDays, CalendarRange, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/profit")({
  component: AdminProfitPage,
  errorComponent: ({ error }) => (
    <div className="hud-panel p-6 text-destructive font-mono text-sm">Failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="hud-panel p-6 font-mono">Not found.</div>,
});

type Row = {
  match_id: number;
  entry_fee_bac: number;
  prize_bac: number;
  joined_at: string;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function AdminProfitPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-profit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_participants")
        .select("match_id, entry_fee_bac, prize_bac, joined_at")
        .limit(50000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const stats = useMemo(() => {
    const list = data ?? [];
    const now = new Date();
    const today = startOfDay(now);
    const sevenAgo = new Date(today);
    sevenAgo.setDate(sevenAgo.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    let total = 0, today_ = 0, week = 0, month = 0, year = 0;
    let totalEntry = 0, totalPrize = 0, matches = new Set<number>();
    let paidMatches = new Set<number>();

    for (const r of list) {
      const entry = Number(r.entry_fee_bac || 0);
      const prize = Number(r.prize_bac || 0);
      const profit = entry - prize;
      const ts = new Date(r.joined_at);
      total += profit;
      totalEntry += entry;
      totalPrize += prize;
      matches.add(r.match_id);
      if (entry > 0) paidMatches.add(r.match_id);
      if (ts >= today) today_ += profit;
      if (ts >= sevenAgo) week += profit;
      if (ts >= monthStart) month += profit;
      if (ts >= yearStart) year += profit;
    }
    return {
      total, today: today_, week, month, year,
      totalEntry, totalPrize,
      matches: matches.size, paidMatches: paidMatches.size,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="hud-panel p-10 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  const tiles = [
    { label: "TOTAL PROFIT", value: stats.total, icon: TrendingUp, tone: "gold" as const },
    { label: "TODAY'S PROFIT", value: stats.today, icon: Calendar, tone: "neutral" as const },
    { label: "LAST 7 DAYS", value: stats.week, icon: CalendarDays, tone: "neutral" as const },
    { label: "CURRENT MONTH", value: stats.month, icon: CalendarRange, tone: "neutral" as const },
    { label: "CURRENT YEAR", value: stats.year, icon: CalendarRange, tone: "neutral" as const },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">
          Admin Profit
        </h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
          By Tournament Match · Entry Fees − Prize Payouts
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => {
          const Icon = t.icon;
          const positive = t.value >= 0;
          const color = t.tone === "gold"
            ? "text-gold"
            : positive ? "text-emerald-400" : "text-red-400";
          return (
            <div key={t.label} className="hud-panel rounded-md border border-border/70 bg-card/60 p-4">
              <div className="flex items-center justify-between">
                <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                  {t.label}
                </span>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className={`mt-2 font-display text-2xl tabular-nums flex items-center gap-1.5 ${color}`}>
                <CoinIcon className="w-5 h-5" />
                {fmt(t.value)}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Breakdown label="Total Entry Fees Collected" value={stats.totalEntry} icon={Wallet} tone="cyan" />
        <Breakdown label="Total Prizes Paid Out" value={stats.totalPrize} icon={Wallet} tone="red" />
        <Breakdown label="Paid Matches / Total" value={`${stats.paidMatches} / ${stats.matches}`} icon={TrendingUp} tone="gold" raw />
      </section>

      <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-4">
        <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-gold">
          How it's calculated
        </h2>
        <p className="text-sm text-foreground/70 leading-relaxed">
          Profit = Sum of <span className="text-foreground">entry fees collected</span> from participants
          minus Sum of <span className="text-foreground">prize coins awarded</span> (kill / win / bonus).
          Free matches contribute 0 entry but still subtract any prizes paid — so they reduce profit.
          Buckets are based on each participant's join timestamp.
        </p>
      </section>
    </div>
  );
}

function Breakdown({
  label, value, icon: Icon, tone, raw,
}: {
  label: string; value: number | string; icon: any;
  tone: "cyan" | "red" | "gold"; raw?: boolean;
}) {
  const color = tone === "cyan" ? "text-cyan-400" : tone === "red" ? "text-red-400" : "text-gold";
  return (
    <div className="hud-panel rounded-md border border-border/70 bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`mt-2 font-display text-xl tabular-nums flex items-center gap-1.5 ${color}`}>
        {!raw && <CoinIcon className="w-4 h-4" />}
        {typeof value === "number" ? fmt(value) : value}
      </div>
    </div>
  );
}
