import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Target, Loader2, Check } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { toast } from "sonner";

type Quest = {
  id: string;
  title: string;
  description: string | null;
  quest_type: string;
  target_value: number;
  reward_bac: number;
  icon: string | null;
  sort_order: number;
};

type Progress = {
  quest_id: string;
  progress: number;
  is_completed: boolean;
  is_claimed: boolean;
};

export function DailyQuestsCard() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const quests = useQuery({
    enabled: !!uid,
    queryKey: ["daily-quests", uid, today],
    queryFn: async () => {
      await supabase.rpc("sync_daily_quest_progress");
      const [q, p] = await Promise.all([
        supabase.from("daily_quests").select("*").eq("is_active", true).order("sort_order"),
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
  });

  useEffect(() => {
    if (uid) supabase.rpc("sync_daily_quest_progress");
  }, [uid]);

  const claim = useMutation({
    mutationFn: async (questId: string) => {
      const { data, error } = await supabase.rpc("claim_quest_reward", { _quest_id: questId });
      if (error) throw error;
      return data as { success: boolean; reward: number };
    },
    onSuccess: (res) => {
      toast.success(`+${res.reward} BAC claimed!`, { icon: "🎯" });
      qc.invalidateQueries({ queryKey: ["daily-quests"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = quests.data?.quests ?? [];
  const progressMap = new Map((quests.data?.progress ?? []).map((p) => [p.quest_id, p]));
  const completedCount = items.filter((q) => {
    const p = progressMap.get(q.id);
    return p?.is_claimed;
  }).length;

  return (
    <section className="hud-panel relative overflow-hidden p-5">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-hud opacity-10" />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-gold" />
          <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">
            Daily Quests
          </h3>
        </div>
        <span className="font-mono text-[11px] text-foreground/60">
          {completedCount}/{items.length} done
        </span>
      </div>

      {quests.isLoading ? (
        <div className="grid place-items-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-xs text-foreground/60">No quests configured.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((q) => {
            const p = progressMap.get(q.id);
            const prog = Math.min(p?.progress ?? 0, q.target_value);
            const pct = Math.round((prog / q.target_value) * 100);
            const done = p?.is_completed;
            const claimed = p?.is_claimed;
            return (
              <li
                key={q.id}
                className={`rounded-md border p-3 transition ${
                  claimed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : done
                      ? "border-gold/50 bg-gold/5"
                      : "border-border/40 bg-background/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-background/60 text-lg">
                    {q.icon ?? "🎯"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-hud text-sm font-semibold">{q.title}</p>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-gold">
                        +{q.reward_bac}
                        <CoinIcon size={12} />
                      </span>
                    </div>
                    {q.description && (
                      <p className="mt-0.5 truncate text-[11px] text-foreground/55">
                        {q.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background/80">
                        <div
                          className={`h-full transition-all ${done ? "bg-gradient-to-r from-gold to-amber-300" : "bg-foreground/40"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] tabular-nums text-foreground/60">
                        {prog}/{q.target_value}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {claimed ? (
                      <span className="flex items-center gap-1 rounded border border-emerald-500/40 px-2 py-1 font-hud text-[10px] uppercase text-emerald-300">
                        <Check size={12} /> Done
                      </span>
                    ) : done ? (
                      <button
                        onClick={() => claim.mutate(q.id)}
                        disabled={claim.isPending}
                        className="btn-gamey px-3 py-1.5 text-[10px]"
                      >
                        {claim.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] uppercase text-foreground/50">
                        In progress
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
