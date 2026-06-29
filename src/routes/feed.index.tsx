import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send, Plus, RefreshCw, MoreHorizontal, Bookmark, Eye, Search } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CommentsThread, LikeBurst } from "@/components/feed/CommentsThread";
import { StoriesRail } from "@/components/feed/StoriesRail";
// SignedMedia handled inside PostMediaCarousel
import { PeopleToFollow } from "@/components/feed/PeopleToFollow";
import { PostMediaCarousel, type CarouselMedia } from "@/components/feed/PostMediaCarousel";
import { RichText } from "@/components/feed/RichText";
import { NotificationBell } from "@/components/feed/NotificationBell";


export const Route = createFileRoute("/feed/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Feed — Battle Asia" },
      { name: "description", content: "Gaming social feed: posts, likes and comments from the Battle Asia community." },
    ],
  }),
  component: FeedPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-6 font-hud text-sm text-red-400">{error.message}</div>
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
  views_count: number;
  created_at: string;
  author?: { username: string | null; display_name: string | null; avatar_url: string | null; in_game_username: string | null } | null;
  liked_by_me?: boolean;
  following_author?: boolean;
  media?: CarouselMedia[];
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null); // ISO created_at of last row
  const [hasMore, setHasMore] = useState(true);
  const blockedRef = useRef<Set<string>>(new Set());
  const followingRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 20;

  // Enrich a chunk of post rows with author/likes/media in batch
  async function enrich(rows: Post[]): Promise<Post[]> {
    if (!rows.length) return [];
    const ids = Array.from(new Set(rows.map((p) => p.user_id)));
    const [{ data: profs }, likesRes, { data: mediaRows }] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,avatar_url,in_game_username").in("id", ids),
      user
        ? supabase
            .from("social_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", rows.map((p) => p.id))
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("social_post_media")
        .select("post_id,url,media_type,position")
        .in("post_id", rows.map((p) => p.id))
        .order("position", { ascending: true }),
    ]);
    const profileMap: Record<string, Post["author"]> = Object.fromEntries(
      (profs ?? []).map((p: any) => [p.id, { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url, in_game_username: p.in_game_username }]),
    );
    const likedSet = new Set(((likesRes as any).data ?? []).map((l: any) => l.post_id));
    const mediaByPost: Record<string, CarouselMedia[]> = {};
    for (const r of (mediaRows ?? []) as any[]) {
      (mediaByPost[r.post_id] ||= []).push({ url: r.url, media_type: r.media_type });
    }
    return rows.map((p) => {
      const extra = mediaByPost[p.id];
      const media: CarouselMedia[] = extra && extra.length
        ? extra
        : p.media_url ? [{ url: p.media_url, media_type: p.media_type ?? "image" }] : [];
      return {
        ...p,
        author: profileMap[p.user_id] ?? null,
        liked_by_me: likedSet.has(p.id),
        following_author: followingRef.current.has(p.user_id),
        media,
      };
    });
  }

  async function load() {
    setLoading(true);
    setHasMore(true);
    setCursor(null);

    blockedRef.current = new Set();
    followingRef.current = new Set();
    if (user) {
      const [a, b, f] = await Promise.all([
        supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id),
        supabase.from("user_blocks").select("blocker_id").eq("blocked_id", user.id),
        supabase.from("user_follows").select("following_id").eq("follower_id", user.id),
      ]);
      (a.data ?? []).forEach((r: any) => blockedRef.current.add(r.blocked_id));
      (b.data ?? []).forEach((r: any) => blockedRef.current.add(r.blocker_id));
      (f.data ?? []).forEach((r: any) => followingRef.current.add(r.following_id));
    }

    // First page: pull a ranked window (150 most recent) and score for relevance
    const { data: rows } = await supabase
      .from("social_posts")
      .select("id,user_id,caption,media_url,media_type,likes_count,comments_count,views_count,created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(150);
    let pool = (rows ?? []) as Post[];
    if (blockedRef.current.size) pool = pool.filter((p) => !blockedRef.current.has(p.user_id));

    const now = Date.now();
    const scored = pool.map((p) => {
      const ageH = Math.max(1, (now - new Date(p.created_at).getTime()) / 3.6e6);
      const viral = (p.likes_count * 3 + p.comments_count * 2) / Math.pow(ageH + 2, 0.8);
      const followBoost = followingRef.current.has(p.user_id) ? 1000 - ageH : 0;
      return { p, score: followBoost + viral };
    });
    scored.sort((x, y) => y.score - x.score);
    const list = scored.slice(0, PAGE_SIZE).map((s) => s.p);

    const enriched = await enrich(list);
    setPosts(enriched);
    // Cursor = oldest created_at in this page → next page continues from there
    if (pool.length > 0) {
      const oldest = pool.reduce((acc, p) => (p.created_at < acc ? p.created_at : acc), pool[0].created_at);
      setCursor(oldest);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  }

  async function loadMore() {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    // Keyset pagination — strictly older than the cursor, no OFFSET scan
    const { data: rows } = await supabase
      .from("social_posts")
      .select("id,user_id,caption,media_url,media_type,likes_count,comments_count,views_count,created_at")
      .eq("visibility", "public")
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    let pool = (rows ?? []) as Post[];
    if (blockedRef.current.size) pool = pool.filter((p) => !blockedRef.current.has(p.user_id));
    if (pool.length === 0) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }
    const enriched = await enrich(pool);
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...enriched.filter((p) => !seen.has(p.id))];
    });
    setCursor(pool[pool.length - 1].created_at);
    if (pool.length < PAGE_SIZE) setHasMore(false);
    setLoadingMore(false);
  }

  // Infinite-scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) loadMore();
    }, { rootMargin: "600px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, hasMore, loadingMore]);



  useEffect(() => {
    load();
    // Phase B: no realtime broadcast on social_posts. Refetch on tab focus instead.
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
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

  // Instagram-style double-tap: only likes, never unlikes
  async function doLikeOnly(post: Post) {
    if (!user) return;
    if (post.liked_by_me) return; // already liked — just show burst (handled by carousel)
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, liked_by_me: true, likes_count: p.likes_count + 1 } : p,
      ),
    );
    await supabase.from("social_likes").insert({ post_id: post.id, user_id: user.id });
  }

  async function toggleFollow(post: Post) {
    if (!user) return toast.error("Sign in to follow");
    if (post.user_id === user.id) return;
    const willFollow = !post.following_author;
    // optimistic across all posts by same author
    setPosts((prev) => prev.map((p) => (p.user_id === post.user_id ? { ...p, following_author: willFollow } : p)));
    try {
      if (willFollow) {
        const { error } = await supabase.from("user_follows").insert({ follower_id: user.id, following_id: post.user_id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", post.user_id);
        if (error) throw error;
      }
    } catch (e: any) {
      toast.error(e.message || "Action failed");
      setPosts((prev) => prev.map((p) => (p.user_id === post.user_id ? { ...p, following_author: !willFollow } : p)));
    }
  }

  return (
    <>
    <div className="mx-auto grid w-full max-w-[1100px] gap-8 px-2 py-5 pb-24 sm:px-4 lg:grid-cols-[minmax(0,640px)_320px]">
      <div className="min-w-0">

        {/* HUD header */}
        <header className="mb-5 flex items-center justify-end gap-2 border-b border-border/60 pb-3">
          <Link to="/explore" className="rounded border border-border/70 p-2 text-foreground/70 transition hover:border-gold/60 hover:text-gold" aria-label="Explore">
            <Search size={14} />
          </Link>
          <NotificationBell />
          <button onClick={load} className="rounded border border-border/70 p-2 text-foreground/70 transition hover:border-gold/60 hover:text-gold" aria-label="Refresh">
            <RefreshCw size={14} />
          </button>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard/story/new" className="btn-outline-gold inline-flex items-center gap-1.5 px-3 py-2 text-xs">
                <Plus size={14} /> Story
              </Link>
              <Link to="/feed/new" className="btn-gold inline-flex items-center gap-1.5 px-3 py-2 text-xs">
                <Plus size={14} /> Post
              </Link>
            </>
          ) : (
            <Link to="/auth" className="btn-gold px-3 py-2 text-xs">Sign in</Link>
          )}
        </header>


        <StoriesRail />

        {/* Mobile-only: players to follow */}
        <div className="my-4 lg:hidden">
          <PeopleToFollow limit={5} title="Players to follow" />
        </div>

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
              <PostCard
                key={p.id}
                post={p}
                onLike={() => toggleLike(p)}
                onDoubleTapLike={() => doLikeOnly(p)}
                onFollow={() => toggleFollow(p)}
                isSelf={user?.id === p.user_id}
              />
            ))}
          </ul>
        )}

        {/* Infinite-scroll sentinel — keyset paginated */}
        {posts.length > 0 && hasMore && (
          <div ref={sentinelRef} className="py-8 text-center font-hud text-xs uppercase tracking-widest text-foreground/40">
            {loadingMore ? "Loading more…" : "Scroll for more"}
          </div>
        )}
        {posts.length > 0 && !hasMore && (
          <div className="py-8 text-center font-hud text-xs uppercase tracking-widest text-foreground/30">
            — End of feed —
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-4">
          <div className="rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/50 mb-2">Quick actions</div>
            <div className="flex flex-col gap-2">
              <Link to="/feed/new" className="btn-gold w-full justify-center inline-flex items-center gap-1.5 px-3 py-2 text-xs"><Plus size={14}/> New post</Link>
              <Link to="/dashboard/story/new" className="btn-outline-gold w-full justify-center inline-flex items-center gap-1.5 px-3 py-2 text-xs"><Plus size={14}/> Add story</Link>
              <Link to="/leaderboard" className="btn-outline-gold w-full justify-center inline-flex items-center gap-1.5 px-3 py-2 text-xs">Leaderboard</Link>
            </div>
          </div>
          <PeopleToFollow limit={8} title="Players to follow" />
          <div className="rounded-xl border border-border/60 bg-card/60 p-4">
            <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/50 mb-2">Trending now</div>
            <ul className="space-y-2 text-xs text-foreground/70">
              {posts.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <Link to="/post/$postId" params={{ postId: p.id }} className="truncate hover:text-gold">
                    {(p.caption || "Untitled drop").slice(0, 40)}
                  </Link>
                  <span className="inline-flex items-center gap-1 font-hud text-[10px] text-foreground/50"><Eye size={12}/>{(p.views_count ?? 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
    </>
  );
}




function PostCard({ post, onLike, onDoubleTapLike, onFollow, isSelf }: { post: Post; onLike: () => void; onDoubleTapLike: () => void; onFollow: () => void; isSelf: boolean }) {
  const handle = post.author?.username || post.author?.display_name || "player";
  const initials = handle.slice(0, 2).toUpperCase();
  const [showComments, setShowComments] = useState(false);
  const [views, setViews] = useState<number>(post.views_count ?? 0);
  const ref = useRef<HTMLLIElement | null>(null);

  useEffect(() => { setViews(post.views_count ?? 0); }, [post.views_count]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let fired = false;
    const obs = new IntersectionObserver(async (entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.5 && !fired) {
          fired = true;
          try {
            const { data } = await supabase.rpc("increment_social_post_view", { p_post_id: post.id });
            if (typeof data === "number") setViews(data);
            else setViews((v) => v + 1);
          } catch { setViews((v) => v + 1); }
          obs.disconnect();
          break;
        }
      }
    }, { threshold: [0.5] });
    obs.observe(el);
    return () => obs.disconnect();
  }, [post.id]);

  return (
    <li ref={ref} className="overflow-hidden rounded-xl border border-border/70 bg-card/70 backdrop-blur transition hover:border-gold/40 hover:shadow-[0_0_24px_-12px_rgba(255,176,32,0.45)]">
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
            {post.author?.in_game_username && (
              <span className="ml-1.5 font-hud text-[11px] font-semibold text-gold/80">
                · 🎮 {post.author.in_game_username}
              </span>
            )}
          </Link>
          <Link
            to="/post/$postId"
            params={{ postId: post.id }}
            className="font-hud text-[10px] uppercase tracking-wider text-foreground/50 hover:text-gold"
          >
            {timeAgo(post.created_at)} ago · View post
          </Link>
        </div>
        {!isSelf && post.author?.username && (
          <button
            onClick={onFollow}
            className={`shrink-0 rounded-md px-2.5 py-1 font-hud text-[10px] font-bold uppercase tracking-widest transition ${
              post.following_author
                ? "border border-gold/40 bg-gold/10 text-gold"
                : "border border-gold bg-gold text-background hover:bg-gold/90"
            }`}
          >
            {post.following_author ? "Following" : "Follow"}
          </button>
        )}
        <Link
          to="/post/$postId"
          params={{ postId: post.id }}
          className="p-1.5 text-foreground/40 hover:text-gold"
          aria-label="View post"
        >
          <MoreHorizontal size={18} />
        </Link>
      </div>

      {/* media — carousel + double-tap to like */}
      {post.media && post.media.length > 0 ? (
        <PostMediaCarousel media={post.media} onDoubleTapLike={onDoubleTapLike} liked={post.liked_by_me} />
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
        <button
          onClick={async () => {
            const url = `${window.location.origin}/post/${post.id}`;
            if ((navigator as any).share) {
              try { await (navigator as any).share({ title: "Battle Asia post", url }); return; } catch {}
            }
            await navigator.clipboard.writeText(url);
            toast.success("Link copied");
          }}
          className="rounded-full p-2 text-foreground/80 transition hover:text-gold"
          aria-label="Share"
        >
          <Send size={22} strokeWidth={2} />
        </button>
        <button className="ml-auto rounded-full p-2 text-foreground/80 transition hover:text-gold" aria-label="Save">
          <Bookmark size={22} strokeWidth={2} />
        </button>
      </div>

      {/* counts + caption */}
      <div className="px-4 pb-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="font-hud text-sm font-bold text-foreground">
            {post.likes_count.toLocaleString()} <span className="font-normal text-foreground/60">likes</span>
          </div>
          <div className="inline-flex items-center gap-1.5 font-hud text-xs text-foreground/60" aria-label="Views">
            <Eye size={14} className="text-gold/80" />
            <span className="font-bold text-foreground/80">{views.toLocaleString()}</span>
            <span className="uppercase tracking-wider text-[10px] text-foreground/50">views</span>
          </div>
        </div>
        {post.caption ? (
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            <Link to="/u/$username" params={{ username: handle }} className="mr-2 font-hud font-bold text-foreground hover:text-gold">
              {handle}
            </Link>
            <RichText text={post.caption} />
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
