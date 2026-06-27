import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Trophy, Target, Swords, Calendar, UserPlus, UserCheck, Ban, Grid3x3, Image as ImageIcon, Video, Heart, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/u/$username")({
  component: PublicProfilePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-12 text-center text-foreground/60">Player not found.</div>
  ),
});

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  pubg_id: string | null;
  game_server: string | null;
  created_at: string;
  premium_expires_at: string | null;
};

function PublicProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, country_code, pubg_id, game_server, created_at, premium_expires_at")
        .ilike("username", username)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();

      const [parts, posts, followers, following, isFollowing, isBlocked] = await Promise.all([
        supabase.from("match_participants").select("kills, prize_bac, rank_position").eq("user_id", data.id).eq("result_applied", true),
        supabase.from("social_posts").select("id, caption, created_at, likes_count, comments_count, media_url, media_type, social_post_media(url, media_type)").eq("user_id", data.id).eq("visibility", "public").order("created_at", { ascending: false }).limit(30),
        supabase.from("user_follows").select("follower_id", { count: "exact", head: true }).eq("following_id", data.id),
        supabase.from("user_follows").select("following_id", { count: "exact", head: true }).eq("follower_id", data.id),
        user ? supabase.from("user_follows").select("follower_id").eq("follower_id", user.id).eq("following_id", data.id).maybeSingle() : Promise.resolve({ data: null }),
        user ? supabase.from("user_blocks").select("blocker_id").eq("blocker_id", user.id).eq("blocked_id", data.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      const stats = (parts.data ?? []).reduce(
        (s: any, p: any) => ({
          kills: s.kills + (p.kills ?? 0),
          prize: s.prize + Number(p.prize_bac ?? 0),
          matches: s.matches + 1,
          wins: s.wins + (p.rank_position === 1 ? 1 : 0),
        }),
        { kills: 0, prize: 0, matches: 0, wins: 0 }
      );

      return {
        profile: data as Profile,
        stats,
        posts: posts.data ?? [],
        followerCount: followers.count ?? 0,
        followingCount: following.count ?? 0,
        isFollowing: !!isFollowing.data,
        isBlocked: !!isBlocked.data,
      };
    },
  });

  async function toggleFollow() {
    if (!user) return toast.error("Sign in to follow");
    if (!q.data) return;
    setBusy(true);
    try {
      if (q.data.isFollowing) {
        await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", q.data.profile.id);
      } else {
        await supabase.from("user_follows").insert({ follower_id: user.id, following_id: q.data.profile.id });
      }
      await qc.invalidateQueries({ queryKey: ["public-profile", username] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    if (!user || !q.data) return;
    setBusy(true);
    try {
      if (q.data.isBlocked) {
        await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", q.data.profile.id);
        toast.success("Unblocked");
      } else {
        await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: q.data.profile.id });
        toast.success("Blocked");
      }
      await qc.invalidateQueries({ queryKey: ["public-profile", username] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (q.isLoading) return <div className="p-12 text-center text-foreground/60">Loading…</div>;
  if (!q.data) return null;
  const { profile, stats, posts, followerCount, followingCount, isFollowing, isBlocked } = q.data;
  const isPremium = profile.premium_expires_at && new Date(profile.premium_expires_at) > new Date();
  const isSelf = user?.id === profile.id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="hud-panel p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {profile.avatar_url ? (
            <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.username} className="h-24 w-24 rounded border-2 border-gold/60 object-cover" />
          ) : (
            <div className="h-24 w-24 rounded border-2 border-border bg-secondary" />
          )}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl uppercase tracking-wider text-gold">{profile.username}</h1>
              {isPremium && <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] uppercase text-purple-400">Premium</span>}
            </div>
            <p className="text-sm text-foreground/70">{profile.display_name}</p>
            <div className="flex gap-5 text-sm pt-1">
              <span><b className="text-gold font-display">{posts.length}</b> <span className="text-foreground/60 text-xs uppercase">Posts</span></span>
              <Link to="/u/$username/followers" params={{ username: profile.username }} className="hover:text-gold transition">
                <b className="text-gold font-display">{followerCount}</b> <span className="text-foreground/60 text-xs uppercase">Followers</span>
              </Link>
              <Link to="/u/$username/following" params={{ username: profile.username }} className="hover:text-gold transition">
                <b className="text-gold font-display">{followingCount}</b> <span className="text-foreground/60 text-xs uppercase">Following</span>
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-foreground/60 font-hud uppercase tracking-widest pt-1">
              {profile.country_code && <span>{profile.country_code}</span>}
              {profile.game_server && <span>Server: {profile.game_server}</span>}
              {profile.pubg_id && <span>PUBG ID: {profile.pubg_id}</span>}
              <span className="flex items-center gap-1"><Calendar size={11} /> Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          {!isSelf && user && (
            <div className="flex gap-2">
              <button
                onClick={toggleFollow}
                disabled={busy}
                className={`flex items-center gap-1.5 px-4 py-2 rounded border font-hud text-xs uppercase tracking-widest transition ${isFollowing ? "border-gold/40 text-gold bg-gold/10" : "border-gold bg-gold text-background hover:bg-gold/90"}`}
              >
                {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
                {isFollowing ? "Following" : "Follow"}
              </button>
              <button
                onClick={toggleBlock}
                disabled={busy}
                title={isBlocked ? "Unblock" : "Block"}
                className="p-2 rounded border border-border text-foreground/60 hover:text-destructive hover:border-destructive transition"
              >
                <Ban size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={Swords} label="Matches" value={stats.matches} />
        <StatTile icon={Target} label="Total Kills" value={stats.kills} />
        <StatTile icon={Trophy} label="Wins" value={stats.wins} />
        <StatTile icon={Trophy} label="Earnings" value={stats.prize.toLocaleString()} />
      </div>

      <div className="hud-panel p-4">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
          <Grid3x3 className="h-4 w-4 text-gold" />
          <h2 className="font-display uppercase tracking-widest text-sm">Posts</h2>
        </div>
        {posts.length === 0 ? (
          <div className="py-12 text-center text-foreground/50 text-sm">No posts yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {posts.map((p: any) => {
              const extra = p.social_post_media?.[0];
              const mediaUrl = p.media_url || extra?.url || null;
              const mediaType = p.media_type || extra?.media_type || null;
              return (
                <Link
                  key={p.id}
                  to="/feed"
                  className="relative aspect-square group overflow-hidden border border-border/40 bg-secondary"
                >
                  {mediaUrl ? (
                    mediaType === "video" ? (
                      <video src={mediaUrl} className="h-full w-full object-cover" muted />
                    ) : (
                      <img loading="lazy" src={mediaUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                    )
                  ) : (
                    <div className="h-full w-full flex items-center justify-center p-2 text-[10px] text-foreground/60 text-center">
                      {p.caption?.slice(0, 80) || "—"}
                    </div>
                  )}
                  {mediaType === "video" && (
                    <Video className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-white drop-shadow" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4 text-white text-xs font-bold">
                    <span className="flex items-center gap-1"><Heart size={14} fill="currentColor" /> {p.likes_count ?? 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={14} fill="currentColor" /> {p.comments_count ?? 0}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="hud-panel p-4 space-y-1">
      <Icon className="h-5 w-5 text-gold" />
      <div className="font-display text-xl text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-foreground/50 font-hud">{label}</div>
    </div>
  );
}
