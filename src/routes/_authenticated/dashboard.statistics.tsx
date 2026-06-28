import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CoinIcon } from "@/components/site/CoinIcon";
import { BarChart3, Loader2 } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/statistics")({
  component: MyStatisticsPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="hud-panel p-6">
        <p className="text-destructive font-mono text-sm">Failed: {error.message}</p>
        <button className="mt-3 btn-outline-gold px-4 py-2 text-xs" onClick={() => { reset(); router.invalidate(); }}>RETRY</button>
      </div>
    );
  },
  notFoundComponent: () => <div className="hud-panel p-6 font-mono">Not found.</div>,
});

type Row = {
  id: number;
  entry_fee_bac: number | null;
  prize_bac: number | null;
  joined_at: string;
  match: {
    id: number;
    match_name: string;
    schedule_at: string;
  } | null;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function MyStatisticsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-statistics", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_participants")
        .select("id, entry_fee_bac, prize_bac, joined_at, match:matches(id, match_name, schedule_at)")
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const totals = useMemo(() => {
    const list = data ?? [];
    let paid = 0, won = 0;
    for (const r of list) {
      paid += Number(r.entry_fee_bac || 0);
      won += Number(r.prize_bac || 0);
    }
    return { paid, won, net: won - paid };
  }, [data]);

  return (
    <div className="space-y-5">
      <header className="hud-panel p-5 flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="font-display text-2xl tracking-wider uppercase">MY STATISTICS</h1>
          <p className="font-mono text-[11px] text-muted-foreground uppercase">Lifetime entry vs prize tracking</p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="TOTAL PAID" value={totals.paid} tone="neutral" />
        <StatCard label="TOTAL WON" value={totals.won} tone="win" />
        <StatCard label="NET PROFIT" value={totals.net} tone={totals.net >= 0 ? "win" : "loss"} />
      </section>

      <div className="hud-panel overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_110px_110px] gap-2 px-3 py-2 border-b border-border bg-card/60 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <div>#</div>
          <div>Match Info</div>
          <div className="text-right">Paid</div>
          <div className="text-right">Won</div>
        </div>

        {isLoading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-10 text-center">
            <p className="font-mono text-sm text-muted-foreground">No match history yet.</p>
            <Link to="/dashboard/matches" className="btn-gold inline-block mt-4 px-5 py-2 text-xs">JOIN A MATCH</Link>
          </div>
        ) : (
          <ul>
            {data!.map((r, idx) => {
              const paid = Number(r.entry_fee_bac || 0);
              const won = Number(r.prize_bac || 0);
              const name = r.match?.match_name ?? "—";
              const ts = r.match?.schedule_at ?? r.joined_at;
              return (
                <li key={r.id} className="grid grid-cols-[40px_1fr_110px_110px] gap-2 px-3 py-3 border-b border-border/40 items-center text-sm">
                  <div className="font-mono text-xs text-muted-foreground">{idx + 1}</div>
                  <Link
                    to="/dashboard/matches/$matchId"
                    params={{ matchId: String(r.match?.id ?? "") }}
                    className="min-w-0 hover:text-primary"
                  >
                    <div className="font-display truncate">{name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {format(new Date(ts), "dd/MM/yyyy hh:mm a")}
                    </div>
                  </Link>
                  <div className="text-right font-mono flex items-center justify-end gap-1">
                    <CoinIcon className="w-3.5 h-3.5" /> {fmt(paid)}
                  </div>
                  <div className={`text-right font-mono flex items-center justify-end gap-1 ${won > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                    <CoinIcon className="w-3.5 h-3.5" /> {fmt(won)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "neutral" | "win" | "loss" }) {
  const color = tone === "win" ? "text-emerald-400" : tone === "loss" ? "text-red-400" : "text-foreground";
  const border = tone === "loss" ? "border-red-500/40 bg-red-500/5" : tone === "win" ? "border-emerald-500/30" : "";
  return (
    <div className={`hud-panel p-4 ${border}`}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl mt-1 flex items-center gap-1.5 ${color}`}>
        <CoinIcon className="w-5 h-5" />
        {fmt(value)}
        {tone === "loss" && <span className="text-base">-</span>}
      </div>
    </div>
  );
}
