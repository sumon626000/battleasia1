import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, ArrowLeft, Share2 } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CommentsThread } from "@/components/feed/CommentsThread";
import { SignedImage, SignedVideo } from "@/components/feed/SignedMedia";

type Post = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
};
type Author = { username: string | null; full_name?: string | null; avatar_url: string | null };

export const Route = createFileRoute("/post/$postId")({
  head: ({ params }) => ({
    meta: [
      { title: `Post — Battle Asia` },
      { property: "og:title", content: "Battle Asia post" },
      { property: "og:url", content: typeof window !== "undefined" ? `${window.location.origin}/post/${params.postId}` : "" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("social_posts")
        .select("id,user_id,caption,media_url,media_type,likes_count,comments_count,created_at")
        .eq("id", postId)
        .maybeSingle();
      if (!data) {
        setNotFoundFlag(true);
        setLoading(false);
        return;
      }
      setPost(data as Post);
      const { data: prof } = await supabase
        .from("profiles")
        .select("username,avatar_url")
        .eq("id", (data as Post).user_id)
        .maybeSingle();
      setAuthor((prof as any) ?? null);
      if (user) {
        const { data: l } = await supabase
          .from("social_likes")
          .select("post_id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        setLiked(!!l);
      }
      setLoading(false);
    })();
  }, [postId, user?.id]);

  async function toggleLike() {
    if (!user || !post) return;
    setLiked((v) => !v);
    setPost((p) => (p ? { ...p, likes_count: Math.max(0, p.likes_count + (liked ? -1 : 1)) } : p));
    if (liked) await supabase.from("social_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    else await supabase.from("social_likes").insert({ post_id: post.id, user_id: user.id });
  }

  async function share() {
    const url = `${window.location.origin}/post/${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Battle Asia post", url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  if (loading) return <SiteShell><div className="mx-auto max-w-2xl p-6 font-hud text-sm text-foreground/60">Loading…</div></SiteShell>;
  if (notFoundFlag || !post) return <SiteShell><div className="mx-auto max-w-2xl p-10 text-center font-hud text-sm text-foreground/60">Post not found.</div></SiteShell>;

  const handle = author?.username || author?.full_name || "player";
  const initials = handle.slice(0, 2).toUpperCase();

  return (
    <SiteShell>
      <div className="mx-auto max-w-[600px] px-2 py-5 sm:px-4">
        <Link to="/feed" className="mb-3 inline-flex items-center gap-1.5 font-hud text-xs uppercase tracking-wider text-foreground/60 hover:text-gold">
          <ArrowLeft size={14} /> Feed
        </Link>

        <article className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
          <div className="flex items-center gap-3 px-3.5 py-3">
            <Link to="/u/$username" params={{ username: handle }} className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-gold via-amber-500 to-rose-500 p-[1.5px]">
              <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-background font-hud text-xs font-bold text-gold">
                {author?.avatar_url ? <img src={author.avatar_url} alt={handle} className="h-full w-full object-cover" /> : initials}
              </span>
            </Link>
            <Link to="/u/$username" params={{ username: handle }} className="font-hud text-sm font-bold text-foreground hover:text-gold">{handle}</Link>
          </div>

          {post.media_url && (
            <div className="bg-black">
              {post.media_type === "video" ? (
                <video src={post.media_url} controls className="max-h-[640px] w-full object-contain" />
              ) : (
                <img src={post.media_url} alt="post" className="max-h-[640px] w-full object-contain" />
              )}
            </div>
          )}

          <div className="flex items-center gap-1 px-2.5 pt-2.5">
            <button onClick={toggleLike} className={`rounded-full p-2 ${liked ? "text-rose-500" : "text-foreground/80 hover:text-rose-400"}`} aria-label="Like">
              <Heart size={24} fill={liked ? "currentColor" : "none"} />
            </button>
            <button className="rounded-full p-2 text-foreground/80" aria-label="Comments">
              <MessageCircle size={22} />
            </button>
            <button onClick={share} className="rounded-full p-2 text-foreground/80 transition hover:text-gold" aria-label="Share">
              <Share2 size={22} />
            </button>
          </div>

          <div className="px-4 pb-3.5">
            <div className="font-hud text-sm font-bold">{post.likes_count.toLocaleString()} <span className="font-normal text-foreground/60">likes</span></div>
            {post.caption && (
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                <Link to="/u/$username" params={{ username: handle }} className="mr-2 font-hud font-bold hover:text-gold">{handle}</Link>
                {post.caption}
              </p>
            )}
          </div>

          <div className="border-t border-border/60 px-4 py-3">
            <CommentsThread postId={post.id} />
          </div>
        </article>
      </div>
    </SiteShell>
  );
}
