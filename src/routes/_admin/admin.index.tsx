import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Swords,
  Wallet,
  ShoppingBag,
  LifeBuoy,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";

export const Route = createFileRoute("/_admin/admin/")({
  component: AdminOverview,
});

async function fetchStats() {
  const head = { count: "exact" as const, head: true };
  const [
    users,
    matches,
    activeMatches,
    pendingDeposits,
    pendingWithdrawals,
    pendingShop,
    openTickets,
    alerts,
    balanceAgg,
    recentLogs,
  ] = await Promise.all([
    supabase.from("profiles").select("*", head),
    supabase.from("matches").select("*", head),
    supabase.from("matches").select("*", head).in("status", ["Upcoming", "Active"]),
    supabase.from("deposits").select("*", head).eq("status", "Pending"),
    supabase.from("withdrawals").select("*", head).eq("status", "Pending"),
    supabase.from("shop_purchases").select("*", head).eq("status", "Pending"),
    supabase.from("support_tickets").select("*", head).neq("status", "Closed"),
    supabase.from("security_alerts").select("*", head).eq("is_resolved", false),
    supabase.from("profiles").select("bac_coin_balance"),
    supabase
      .from("admin_action_logs")
      .select("id, action, module, target_type, target_id, new_value, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalBac = (balanceAgg.data ?? []).reduce(
    (a: number, r: { bac_coin_balance: number | null }) => a + Number(r.bac_coin_balance ?? 0),
    0
  );

  return {
    users: users.count ?? 0,
    matches: matches.count ?? 0,
    activeMatches: activeMatches.count ?? 0,
    pendingDeposits: pendingDeposits.count ?? 0,
    pendingWithdrawals: pendingWithdrawals.count ?? 0,
    pendingShop: pendingShop.count ?? 0,
    openTickets: openTickets.count ?? 0,
    alerts: alerts.count ?? 0,
    totalBac,
    recentLogs: recentLogs.data ?? [],
  };
}

function AdminOverview() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: fetchStats });

  const tiles = [
    { label: "Total Users", value: data?.users ?? 0, icon: Users, color: "text-cyan-400" },
    { label: "Active Matches", value: data?.activeMatches ?? 0, icon: Swords, color: "text-gold" },
    { label: "Total Matches", value: data?.matches ?? 0, icon: Activity, color: "text-emerald-400" },
    { label: "BAC in Circulation", value: Math.round(data?.totalBac ?? 0).toLocaleString(), icon: TrendingUp, color: "text-gold" },
    { label: "Pending Deposits", value: data?.pendingDeposits ?? 0, icon: Wallet, color: "text-amber-400" },
    { label: "Pending Withdrawals", value: data?.pendingWithdrawals ?? 0, icon: Wallet, color: "text-amber-400" },
    { label: "Pending Shop Orders", value: data?.pendingShop ?? 0, icon: ShoppingBag, color: "text-amber-400" },
    { label: "Open Tickets", value: data?.openTickets ?? 0, icon: LifeBuoy, color: "text-cyan-400" },
    { label: "Security Alerts", value: data?.alerts ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">
          Command Overview
        </h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
          Real-time operational telemetry
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.label}
              className="hud-panel rounded-md border border-border/70 bg-card/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                  {t.label}
                </span>
                <Icon className={`h-4 w-4 ${t.color}`} />
              </div>
              <div className="mt-2 font-display text-2xl tabular-nums text-foreground">
                {isLoading ? "—" : t.value}
              </div>
            </div>
          );
        })}
      </div>

      <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-4">
        <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-gold">
          Recent Admin Actions
        </h2>
        <div className="space-y-2">
          {(data?.recentLogs ?? []).length === 0 && (
            <div className="font-hud text-xs uppercase tracking-widest text-foreground/50">
              No actions logged yet.
            </div>
          )}
          {(data?.recentLogs ?? []).map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 text-sm last:border-0"
            >
              <div>
                <span className="font-hud text-[10px] uppercase tracking-widest text-gold">
                  {log.action_type}
                </span>
                <p className="text-foreground/80">{log.description}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-foreground/50">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
