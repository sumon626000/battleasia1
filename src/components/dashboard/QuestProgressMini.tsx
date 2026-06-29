import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Target, Check, Gift } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";

type Quest = {
  id: string;
  title: string;
  target_value: number;
  reward_bac: number;
  sort_order: number;
};
type Progress = {
  quest_id: string;
  progress: number;
  is_completed: boolean;
  is_claimed: boolean;
};

export function QuestProgressMini() {
  const { user } = useAuth();
  const uid = user?.id;
  const today = new Date().toISOString().slice(0, 10);

  const { data } = useQuery({
    enabled: !!uid,
    queryKey: ["quest-mini", uid, today],
    queryFn: async () => {
      const [q, p] = await Promise.all([
        supabase
          .from("daily_quests")
          .select("id, title, target_value, reward_bac, sort_order")
          .eq("is_active", true)
          .order("sort_order")
          .limit(3),
        supabase
          .from("user_quest_progress")
          .select("quest_id, progress, is_completed, is_claimed")
          .eq("user_id", uid!)
          .eq("quest_date", today),
      ]);
      return {
        quests: (q.data ?? []) as Quest[],
        progress: (p.data ?? []) as Progress[],
      };
    },
    staleTime: 30_000,
  });

  const quests = data?.quests ?? [];
  if (!quests.length) return null;
  const pMap = new Map((data?.progress ?? []).map((x) => [x.quest_id, x]));

  return (
    <section className="hud-panel relative overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-gold" />
          <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
            Daily Quests
          </h2>
        </div>
        <Link
          to="/dashboard"
          className="font-hud text-[10px] uppercase tracking-widest text-foreground/55 hover:text-gold"
        >
          All →
        </Link>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {quests.map((q) => {
          const p = pMap.get(q.id);
          const cur = Math.min(p?.progress ?? 0, q.target_value);
          const pct = Math.min(100, Math.round((cur / Math.max(1, q.target_value)) * 100));
          const done = p?.is_completed;
          const claimed = p?.is_claimed;
          return (
            <div
              key={q.id}
              className={`relative overflow-hidden rounded border bg-background/40 p-2.5 transition ${
                claimed
                  ? "border-emerald-400/40 opacity-70"
                  : done
                    ? "border-gold/60 shadow-[0_0_10px_-2px_rgba(212,175,55,0.45)]"
                    : "border-border/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[11px] text-foreground/85">{q.title}</span>
                <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] text-gold">
                  <CoinIcon size={9} />
                  {q.reward_bac}
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={`h-full transition-all duration-500 ${
                    claimed
                      ? "bg-emerald-400/70"
                      : done
                        ? "bg-gradient-to-r from-gold/70 via-gold to-amber-300 shadow-[0_0_6px_rgba(212,175,55,0.6)]"
                        : "bg-gold/50"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-foreground/55">
                <span className="tabular-nums">
                  {cur}/{q.target_value}
                </span>
                {claimed ? (
                  <span className="inline-flex items-center gap-0.5 text-emerald-400">
                    <Check size={10} /> Claimed
                  </span>
                ) : done ? (
                  <span className="inline-flex items-center gap-0.5 text-gold">
                    <Gift size={10} /> Ready
                  </span>
                ) : (
                  <span className="tabular-nums">{pct}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
