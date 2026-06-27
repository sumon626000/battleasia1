import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send, Plus, RefreshCw, MoreHorizontal, Bookmark } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CommentsThread, LikeBurst } from "@/components/feed/CommentsThread";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Battle Asia" },
      { name: "description", content: "Gaming social feed: posts, likes and comments from the Battle Asia community." },
    ],
  }),
  component: FeedPage,
  errorComponent: ({ error }) => (
    <SiteShell>
      <div className="mx-auto max-w-2xl p-6 font-hud text-sm text-red-400">{error.message}</div>
    </SiteShell>
  ),
});

type Post = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author?: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
  liked_by_me?: boolean;
};

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(d).toLocaleDateString();
}

function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    // Blocked users (both directions) — exclude from feed
    let blockedIds = new Set<string>();
    if (user) {
      const [a, b] = await Promise.all([
        supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id),
        supabase.from("user_blocks").select("blocker_id").eq("blocked_id", user.id),
      ]);
      (a.data ?? []).forEach((r: any) => blockedIds.add(r.blocked_id));
      (b.data ?? []).forEach((r: any) => blockedIds.add(r.blocker_id));
    }

    const { data: rows } = await supabase
      .from("social_posts")
      .select("id,user_id,caption,media_url,media_type,likes_count,comments_count,created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(50);
    let list = (rows ?? []) as Post[];
    if (blockedIds.size) list = list.filter((p) => !blockedIds.has(p.user_id));

    const ids = Array.from(new Set(list.map((p) => p.user_id)));
    let profileMap: Record<string, Post["author"]> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .in("id", ids);
      profileMap = Object.fromEntries(
        (profs ?? []).map((p: any) => [p.id, { username: p.username, full_name: p.full_name, avatar_url: p.avatar_url }]),
      );
    }
    let likedSet = new Set<string>();
    if (user && list.length) {
      const { data: likes } = await supabase
        .from("social_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", list.map((p) => p.id));
      likedSet = new Set((likes ?? []).map((l: any) => l.post_id));
    }
    setPosts(list.map((p) => ({ ...p, author: profileMap[p.user_id] ?? null, liked_by_me: likedSet.has(p.id) })));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("feed-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_posts" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function toggleLike(post: Post) {
    if (!user) return;
    const liked = post.liked_by_me;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !liked, likes_count: Math.max(0, p.likes_count + (liked ? -1 : 1)) }
          : p,
      ),
    );
    if (liked) {
      await supabase.from("social_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("social_likes").insert({ post_id: post.id, user_id: user.id });
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-[600px] px-2 py-5 sm:px-4">
        {/* HUD header */}
        <header className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-black tracking-wider text-foreground">
              <span className="text-gold">BATTLE</span> FEED
            </h1>
            <div className="flex items-center gap-2 font-hud text-[10px] uppercase tracking-widest text-foreground/50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Live drops from the squad
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="rounded border border-border/70 p-2 text-foreground/70 transition hover:border-gold/60 hover:text-gold" aria-label="Refresh">
              <RefreshCw size={14} />
            </button>
            {isAuthenticated ? (
              <Link to="/feed/new" className="btn-gold inline-flex items-center gap-1.5 px-3 py-2 text-xs">
                <Plus size={14} /> Post
              </Link>
            ) : (
              <Link to="/auth" className="btn-gold px-3 py-2 text-xs">Sign in</Link>
            )}
          </div>
        </header>

        {loading && posts.length === 0 ? (
          <div className="space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[480px] animate-pulse rounded-xl border border-border/60 bg-card/40" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-10 text-center font-hud text-sm text-foreground/60">
            No posts yet. Be the first to drop.
          </div>
        ) : (
          <ul className="space-y-6">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onLike={() => toggleLike(p)} />
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}

function PostCard({ post, onLike }: { post: Post; onLike: () => void }) {
  const handle = post.author?.username || post.author?.full_name || "player";
  const initials = handle.slice(0, 2).toUpperCase();
  const [showComments, setShowComments] = useState(false);

  return (
    <li className="overflow-hidden rounded-xl border border-border/70 bg-card/70 backdrop-blur transition hover:border-gold/40 hover:shadow-[0_0_24px_-12px_rgba(255,176,32,0.45)]">
      {/* author row */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        <Link
          to="/u/$username"
          params={{ username: handle }}
          className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-gold via-amber-500 to-rose-500 p-[1.5px]"
        >
          <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-background font-hud text-xs font-bold text-gold">
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} alt={handle} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
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
            {timeAgo(post.created_at)} ago
          </div>
        </div>
        <button className="p-1.5 text-foreground/40 hover:text-foreground" aria-label="More">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* media */}
      {post.media_url ? (
        <div className="relative bg-black">
          {post.media_type === "video" ? (
            <video src={post.media_url} controls className="max-h-[640px] w-full object-contain" />
          ) : (
            <img src={post.media_url} alt="post" className="max-h-[640px] w-full object-contain" loading="lazy" />
          )}
          {/* corner HUD bracket */}
          <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-gold/70" />
          <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r-2 border-t-2 border-gold/70" />
          <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-gold/70" />
          <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-gold/70" />
        </div>
      ) : null}

      {/* action bar — Instagram-style */}
      <div className="flex items-center gap-1 px-2.5 pt-2.5">
        <button
          onClick={onLike}
          className={`group rounded-full p-2 transition ${post.liked_by_me ? "text-rose-500" : "text-foreground/80 hover:text-rose-400"}`}
          aria-label="Like"
        >
          <LikeBurst active={!!post.liked_by_me}>
            <Heart size={24} className="transition group-active:scale-90" fill={post.liked_by_me ? "currentColor" : "none"} strokeWidth={2} />
          </LikeBurst>
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className={`rounded-full p-2 transition ${showComments ? "text-gold" : "text-foreground/80 hover:text-gold"}`}
          aria-label="Comments"
        >
          <MessageCircle size={22} strokeWidth={2} />
        </button>
        <button className="rounded-full p-2 text-foreground/80 transition hover:text-gold" aria-label="Share">
          <Send size={22} strokeWidth={2} />
        </button>
        <button className="ml-auto rounded-full p-2 text-foreground/80 transition hover:text-gold" aria-label="Save">
          <Bookmark size={22} strokeWidth={2} />
        </button>
      </div>

      {/* counts + caption */}
      <div className="px-4 pb-3.5">
        <div className="font-hud text-sm font-bold text-foreground">
          {post.likes_count.toLocaleString()} <span className="font-normal text-foreground/60">likes</span>
        </div>
        {post.caption ? (
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            <Link to="/u/$username" params={{ username: handle }} className="mr-2 font-hud font-bold text-foreground hover:text-gold">
              {handle}
            </Link>
            {post.caption}
          </p>
        ) : null}
        {post.comments_count > 0 && !showComments && (
          <button
            onClick={() => setShowComments(true)}
            className="mt-1.5 font-hud text-xs uppercase tracking-wider text-foreground/50 hover:text-gold"
          >
            View all {post.comments_count} comments
          </button>
        )}
      </div>

      {showComments && (
        <div className="border-t border-border/60">
          <CommentsThread postId={post.id} />
        </div>
      )}
    </li>
  );
}
