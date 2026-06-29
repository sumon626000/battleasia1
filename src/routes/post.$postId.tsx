import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CommentsThread, LikeBurst } from "@/components/feed/CommentsThread";
import { PostMediaCarousel, type CarouselMedia } from "@/components/feed/PostMediaCarousel";
import { RichText } from "@/components/feed/RichText";

export const Route = createFileRoute("/post/$postId")({
  head: () => ({
    meta: [
      { title: "Post — Battle Asia" },
      { name: "description", content: "View post on Battle Asia feed." },
    ],
  }),
  component: PostView,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl p-6 font-hud text-sm text-red-400">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl p-6 font-hud text-sm text-foreground/60">Post not found.</div>
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

function PostView() {
  const { postId } = Route.useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: row } = await supabase
      .from("social_posts")
      .select("id,user_id,caption,media_url,media_type,likes_count,comments_count,created_at")
      .eq("id", postId)
      .maybeSingle();
    if (!row) { setPost(null); setLoading(false); return; }
    const [{ data: prof }, likeRes, mediaRes] = await Promise.all([
      supabase.from("profiles").select("username,full_name,avatar_url").eq("id", row.user_id).maybeSingle(),
      user
        ? supabase.from("social_likes").select("post_id").eq("post_id", row.id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("social_post_media").select("url,media_type,position").eq("post_id", row.id).order("position", { ascending: true }),
    ]);
    const extra = (mediaRes.data ?? []) as { url: string; media_type: string }[];
    const media: CarouselMedia[] = extra.length
      ? extra.map((m) => ({ url: m.url, media_type: m.media_type }))
      : row.media_url
        ? [{ url: row.media_url, media_type: row.media_type ?? "image" }]
        : [];
    setPost({ ...(row as Post), author: prof as any, liked_by_me: !!likeRes.data, media });
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`post-${postId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "social_posts", filter: `id=eq.${postId}` }, (payload) => {
        const n = payload.new as any;
        setPost((p) => (p ? { ...p, likes_count: n.likes_count, comments_count: n.comments_count } : p));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.id]);

  async function toggleLike() {
    if (!user || !post) return;
    const liked = post.liked_by_me;
    setPost({ ...post, liked_by_me: !liked, likes_count: Math.max(0, post.likes_count + (liked ? -1 : 1)) });
    if (liked) {
      await supabase.from("social_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("social_likes").insert({ post_id: post.id, user_id: user.id });
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-[600px] p-6"><div className="h-[480px] animate-pulse rounded-xl border border-border/60 bg-card/40" /></div>;
  }
  if (!post) {
    return <div className="mx-auto max-w-[600px] p-6 font-hud text-sm text-foreground/60">Post not found.</div>;
  }

  const handle = post.author?.username || post.author?.full_name || "player";
  const initials = handle.slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-[600px] px-2 py-5 sm:px-4">
      <button
        onClick={() => router.history.back()}
        className="mb-4 inline-flex items-center gap-1.5 rounded border border-border/70 px-3 py-1.5 font-hud text-[11px] uppercase tracking-wider text-foreground/70 hover:border-gold/60 hover:text-gold"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <article className="overflow-hidden rounded-xl border border-border/70 bg-card/70 backdrop-blur">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <Link to="/u/$username" params={{ username: handle }} className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-gold via-amber-500 to-rose-500 p-[1.5px]">
            <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-background font-hud text-xs font-bold text-gold">
              {post.author?.avatar_url ? <img src={post.author.avatar_url} alt={handle} className="h-full w-full object-cover" /> : initials}
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <Link to="/u/$username" params={{ username: handle }} className="block truncate font-hud text-sm font-bold text-foreground hover:text-gold">{handle}</Link>
            <div className="font-hud text-[10px] uppercase tracking-wider text-foreground/50">{timeAgo(post.created_at)} ago</div>
          </div>
        </div>

        {post.media && post.media.length > 0 ? (
          <PostMediaCarousel
            media={post.media}
            liked={post.liked_by_me}
            onDoubleTapLike={() => {
              if (!post.liked_by_me) toggleLike();
            }}
          />
        ) : null}

        <div className="flex items-center gap-1 px-2.5 pt-2.5">
          <button onClick={toggleLike} className={`rounded-full p-2 transition ${post.liked_by_me ? "text-rose-500" : "text-foreground/80 hover:text-rose-400"}`} aria-label="Like">
            <LikeBurst active={!!post.liked_by_me}>
              <Heart size={24} fill={post.liked_by_me ? "currentColor" : "none"} strokeWidth={2} />
            </LikeBurst>
          </button>
          <button className="rounded-full p-2 text-foreground/80" aria-label="Comments"><MessageCircle size={22} strokeWidth={2} /></button>
          <button
            onClick={async () => {
              const url = `${window.location.origin}/post/${post.id}`;
              if ((navigator as any).share) { try { await (navigator as any).share({ url }); return; } catch {} }
              await navigator.clipboard.writeText(url);
              toast.success("Link copied");
            }}
            className="rounded-full p-2 text-foreground/80 hover:text-gold"
            aria-label="Share"
          >
            <Send size={22} strokeWidth={2} />
          </button>
          <button className="ml-auto rounded-full p-2 text-foreground/80 hover:text-gold" aria-label="Save"><Bookmark size={22} strokeWidth={2} /></button>
        </div>

        <div className="px-4 pb-3.5">
          <div className="font-hud text-sm font-bold text-foreground">
            {post.likes_count.toLocaleString()} <span className="font-normal text-foreground/60">likes</span>
          </div>
          {post.caption ? (
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              <Link to="/u/$username" params={{ username: handle }} className="mr-2 font-hud font-bold text-foreground hover:text-gold">{handle}</Link>
              <RichText text={post.caption} />
            </p>
          ) : null}
        </div>

        <div className="border-t border-border/60">
          <CommentsThread postId={post.id} />
        </div>
      </article>
    </div>
  );
}
