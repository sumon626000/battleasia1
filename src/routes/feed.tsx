import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Image as ImageIcon, Plus, RefreshCw } from "lucide-react";
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
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-2xl p-6 font-hud text-sm">No posts.</div>
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
  author?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  liked_by_me?: boolean;
};

function FeedPage() {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: rows } = await supabase
      .from("social_posts")
      .select("id,user_id,caption,media_url,media_type,likes_count,comments_count,created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (rows ?? []) as Post[];
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
      <div className="mx-auto max-w-2xl px-3 py-6 sm:px-4">
        <header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-black tracking-wide text-foreground sm:text-3xl">
              <span className="text-gold">BATTLE</span> FEED
            </h1>
            <p className="font-hud text-xs text-foreground/60">Live drops from the squad</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={load} className="btn-outline-gold px-3 py-2 text-xs" aria-label="Refresh">
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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl border border-border/60 bg-card/40" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/40 p-10 text-center font-hud text-sm text-foreground/60">
            No posts yet. Be the first to drop.
          </div>
        ) : (
          <ul className="space-y-5">
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
  const time = new Date(post.created_at).toLocaleString();
  const [showComments, setShowComments] = useState(false);
  return (
    <li className="overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-[0_0_0_1px_rgba(255,176,32,0.05)] backdrop-blur transition hover:border-gold/40">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          to="/u/$username"
          params={{ username: handle }}
          className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/40 bg-background/60 font-hud text-xs font-bold text-gold"
        >
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt={handle} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/u/$username"
            params={{ username: handle }}
            className="block truncate font-hud text-sm font-bold text-foreground hover:text-gold"
          >
            @{handle}
          </Link>
          <div className="font-hud text-[10px] uppercase tracking-wider text-foreground/50">{time}</div>
        </div>
      </div>

      {post.media_url ? (
        post.media_type === "video" ? (
          <video src={post.media_url} controls className="max-h-[640px] w-full bg-black object-contain" />
        ) : (
          <img src={post.media_url} alt="post" className="max-h-[640px] w-full bg-black object-contain" />
        )
      ) : null}

      <div className="px-4 py-3">
        {post.caption ? (
          <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{post.caption}</p>
        ) : null}
        <div className="flex items-center gap-4 font-hud text-xs">
          <button
            onClick={onLike}
            className={`inline-flex items-center gap-1.5 transition ${post.liked_by_me ? "text-red-400" : "text-foreground/70 hover:text-red-400"}`}
          >
            <LikeBurst active={!!post.liked_by_me} />
            <span className="font-bold">{post.likes_count}</span>
          </button>
          <button
            onClick={() => setShowComments((v) => !v)}
            className={`inline-flex items-center gap-1.5 transition ${showComments ? "text-gold" : "text-foreground/70 hover:text-gold"}`}
          >
            <MessageCircle size={16} />
            <span className="font-bold">{post.comments_count}</span>
          </button>
          {post.media_type ? (
            <span className="ml-auto inline-flex items-center gap-1 text-foreground/40">
              <ImageIcon size={12} /> {post.media_type}
            </span>
          ) : null}
        </div>
      </div>
      {showComments && <CommentsThread postId={post.id} />}
    </li>
  );
}
