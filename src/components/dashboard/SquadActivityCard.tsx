import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Users, UserPlus, Swords, Circle } from "lucide-react";

type Profile = {
  id: string;
  username: string | null;
  in_game_username: string | null;
  avatar_url: string | null;
};

function timeAgo(iso: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export function SquadActivityCard() {
  const { user } = useAuth();
  const uid = user?.id;

  const { data } = useQuery({
    enabled: !!uid,
    queryKey: ["squad-activity", uid],
    queryFn: async () => {
      const follows = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", uid!)
        .limit(50);
      const ids = (follows.data ?? []).map((r) => r.following_id);
      if (!ids.length) return { friends: [] as (Profile & { last_seen_at: string | null; online: boolean })[] };

      const [profs, sessions] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, in_game_username, avatar_url")
          .in("id", ids),
        supabase
          .from("online_sessions")
          .select("user_id, last_seen_at")
          .in("user_id", ids)
          .order("last_seen_at", { ascending: false }),
      ]);

      const lastByUser = new Map<string, string>();
      for (const s of sessions.data ?? []) {
        if (!lastByUser.has(s.user_id)) lastByUser.set(s.user_id, s.last_seen_at);
      }
      const now = Date.now();
      const friends = (profs.data ?? []).map((p) => {
        const last = lastByUser.get(p.id) ?? null;
        const online = !!last && now - new Date(last).getTime() < 5 * 60_000;
        return { ...(p as Profile), last_seen_at: last, online };
      });
      friends.sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? "");
      });
      return { friends: friends.slice(0, 8) };
    },
    staleTime: 60_000,
  });

  const friends = data?.friends ?? [];
  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <section className="hud-panel relative overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-gold" />
          <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
            Squad Activity
          </h2>
          {onlineCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
              <Circle size={6} fill="currentColor" className="animate-pulse" />
              {onlineCount} online
            </span>
          )}
        </div>
        <Link
          to="/explore"
          className="font-hud text-[10px] uppercase tracking-widest text-foreground/55 hover:text-gold"
        >
          Find →
        </Link>
      </div>

      {friends.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full border border-gold/30 bg-gold/5">
            <UserPlus size={20} className="text-gold/70" />
          </div>
          <p className="font-mono text-xs text-foreground/60">No squad yet — follow players to build your team.</p>
          <Link
            to="/explore"
            className="mt-1 rounded border border-gold/60 bg-gold/10 px-3 py-1 font-hud text-[10px] font-bold uppercase tracking-widest text-gold hover:bg-gold hover:text-background"
          >
            Find Players
          </Link>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {friends.map((f) => {
            const name = f.in_game_username || f.username || "Player";
            return (
              <li key={f.id}>
                <div className="group flex items-center gap-2.5 rounded border border-border/40 bg-background/40 px-2.5 py-2 transition hover:border-gold/50 hover:bg-gold/5">
                  <Link
                    to="/u/$username"
                    params={{ username: f.username || f.id }}
                    className="relative shrink-0"
                  >
                    <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-border/60 bg-background/60 font-mono text-[11px] text-foreground/70">
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span
                      aria-hidden
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                        f.online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" : "bg-foreground/30"
                      }`}
                    />
                  </Link>
                  <Link
                    to="/u/$username"
                    params={{ username: f.username || f.id }}
                    className="min-w-0 flex-1"
                  >
                    <div className="truncate text-xs font-semibold group-hover:text-gold">{name}</div>
                    <div className="font-mono text-[10px] text-foreground/55">
                      {f.online ? "Online now" : f.last_seen_at ? `${timeAgo(f.last_seen_at)} ago` : "Offline"}
                    </div>
                  </Link>
                  <Link
                    to="/dashboard/matches"
                    aria-label={`Invite ${name}`}
                    title="Invite to match"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded border border-border/50 text-foreground/55 transition hover:border-gold hover:bg-gold/10 hover:text-gold"
                  >
                    <Swords size={13} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
