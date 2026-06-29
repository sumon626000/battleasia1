import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserPlus, UserCheck, Users, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Row = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  followers: number;
  following_me: boolean;
};

export function PeopleToFollow({ limit = 8, title = "Players to follow" }: { limit?: number; title?: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    // blocks both directions
    const blocked = new Set<string>();
    if (user) {
      const [a, b] = await Promise.all([
        supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id),
        supabase.from("user_blocks").select("blocker_id").eq("blocked_id", user.id),
      ]);
      (a.data ?? []).forEach((r: any) => blocked.add(r.blocked_id));
      (b.data ?? []).forEach((r: any) => blocked.add(r.blocker_id));
    }

    const { data: profs } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url,country_code,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    let pool = (profs ?? []).filter((p: any) => p.id !== user?.id && !blocked.has(p.id) && (p.username || p.display_name));
    const ids = pool.map((p: any) => p.id);

    // counts + my follows
    const [counts, mine] = await Promise.all([
      ids.length
        ? supabase.from("user_follows").select("following_id").in("following_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      user && ids.length
        ? supabase.from("user_follows").select("following_id").eq("follower_id", user.id).in("following_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const cmap: Record<string, number> = {};
    (counts.data ?? []).forEach((r: any) => { cmap[r.following_id] = (cmap[r.following_id] ?? 0) + 1; });
    const followed = new Set<string>((mine.data ?? []).map((r: any) => r.following_id));

    const enriched: Row[] = pool.map((p: any) => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      country_code: p.country_code,
      followers: cmap[p.id] ?? 0,
      following_me: followed.has(p.id),
    }));

    // rank: not-following first, then by followers
    enriched.sort((x, y) => Number(x.following_me) - Number(y.following_me) || y.followers - x.followers);
    setRows(enriched.slice(0, limit));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, limit]);

  async function toggle(r: Row) {
    if (!user) return toast.error("Sign in to follow");
    setBusy(r.id);
    const willFollow = !r.following_me;
    setRows((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? { ...x, following_me: willFollow, followers: Math.max(0, x.followers + (willFollow ? 1 : -1)) }
          : x,
      ),
    );
    try {
      if (willFollow) {
        const { error } = await supabase.from("user_follows").insert({ follower_id: user.id, following_id: r.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", r.id);
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e.message || "Action failed");
      // revert
      setRows((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? { ...x, following_me: r.following_me, followers: r.followers }
            : x,
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-hud text-[10px] uppercase tracking-widest text-foreground/60">
          <Users size={12} className="text-gold" /> {title}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-gold" size={16} /></div>
      ) : rows.length === 0 ? (
        <div className="py-4 text-center font-hud text-[11px] text-foreground/50">No players yet.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const handle = r.username || r.display_name || "player";
            const initials = handle.slice(0, 2).toUpperCase();
            return (
              <li key={r.id} className="flex items-center gap-3">
                <Link
                  to="/u/$username"
                  params={{ username: handle }}
                  className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-gold via-amber-500 to-rose-500 p-[1.5px]"
                >
                  <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-background font-hud text-[10px] font-bold text-gold">
                    {r.avatar_url ? <img src={r.avatar_url} alt={handle} className="h-full w-full object-cover" /> : initials}
                  </span>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/u/$username"
                    params={{ username: handle }}
                    className="block truncate font-hud text-sm font-bold text-foreground hover:text-gold"
                  >
                    {handle}
                  </Link>
                  <div className="font-hud text-[10px] uppercase tracking-wider text-foreground/50">
                    {r.followers.toLocaleString()} followers
                    {r.country_code ? <span className="ml-1">· {r.country_code}</span> : null}
                  </div>
                </div>
                <Link
                  to="/u/$username"
                  params={{ username: handle }}
                  className="rounded border border-border/70 p-1.5 text-foreground/60 hover:border-gold/60 hover:text-gold"
                  aria-label="View profile"
                  title="View profile"
                >
                  <Eye size={13} />
                </Link>
                <button
                  onClick={() => toggle(r)}
                  disabled={busy === r.id}
                  className={`inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-hud text-[10px] font-bold uppercase tracking-widest transition ${
                    r.following_me
                      ? "border border-gold/40 bg-gold/10 text-gold"
                      : "border border-gold bg-gold text-background hover:bg-gold/90"
                  }`}
                >
                  {r.following_me ? <UserCheck size={12} /> : <UserPlus size={12} />}
                  {r.following_me ? "Following" : "Follow"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
