import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Heart, MessageCircle, Eye, Crown, Send, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/feed/$postId")({
  component: PostDetail,
});

type Post = {
  id: number; title: string; description_html: string; cover_image_url: string | null;
  premium_only: boolean; likes_count: number; comments_count: number; views_count: number;
  published_at: string | null; category_id: number | null;
};
type Comment = {
  id: number; comment_text: string; created_at: string; user_id: string;
  username?: string | null;
};

function PostDetail() {
  const { postId } = Route.useParams();
  const id = Number(postId);
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("feed_posts").select("*").eq("id", id).maybeSingle();
    setPost(data as Post);
    const { data: cs } = await supabase.from("feed_comments")
      .select("id,comment_text,created_at,user_id")
      .eq("post_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(100);
    const rows = (cs as Comment[]) ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p.username]));
      rows.forEach((r) => { r.username = map.get(r.user_id) ?? null; });
    }
    setComments(rows);
    if (user) {
      const { data: like } = await supabase.from("feed_likes").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle();
      setLiked(!!like);
    }
  };

  useEffect(() => {
    load();
    supabase.rpc("increment_feed_view", { p_post_id: id });
     
  }, [id, user?.id]);

  const toggleLike = async () => {
    const { data } = await supabase.rpc("toggle_feed_like", { p_post_id: id });
    setLiked(!!data);
    setPost((p) => p ? { ...p, likes_count: Math.max(0, p.likes_count + (data ? 1 : -1)) } : p);
  };

  const submit = async () => {
    if (!text.trim()) return;
    setSending(true);
    const { error } = await supabase.rpc("add_feed_comment", { p_post_id: id, p_text: text.trim() });
    setSending(false);
    if (!error) { setText(""); await load(); }
  };

  if (!post) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/dashboard/feed" className="inline-flex items-center gap-2 font-hud text-xs uppercase tracking-wider text-foreground/70 hover:text-gold">
        <ArrowLeft size={14} /> Back to feed
      </Link>

      <article className="hud-panel overflow-hidden">
        {post.cover_image_url && (
          <div className="aspect-video w-full bg-secondary/40"><img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover" /></div>
        )}
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-foreground/60">
            {post.premium_only && (
              <span className="inline-flex items-center gap-1 rounded border border-amber-500/50 px-2 py-0.5 text-amber-400"><Crown size={10} /> PREMIUM</span>
            )}
            {post.published_at && <span>{new Date(post.published_at).toLocaleString()}</span>}
            <span className="inline-flex items-center gap-1"><Eye size={12} /> {post.views_count}</span>
          </div>
          <h1 className="font-display text-3xl uppercase leading-tight tracking-wide">{post.title}</h1>
          <div className="prose prose-invert max-w-none font-mono text-sm leading-relaxed text-foreground/85"
               dangerouslySetInnerHTML={{ __html: post.description_html }} />

          <div className="flex items-center gap-3 border-t border-border/60 pt-4">
            <button onClick={toggleLike}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-hud text-xs font-bold uppercase tracking-wider transition ${
                liked ? "border-red-500/60 bg-red-500/15 text-red-400" : "border-border text-foreground/70 hover:border-gold/60 hover:text-gold"
              }`}>
              <Heart size={14} fill={liked ? "currentColor" : "none"} /> {post.likes_count}
            </button>
            <span className="inline-flex items-center gap-2 font-mono text-xs text-foreground/60">
              <MessageCircle size={14} /> {post.comments_count} comments
            </span>
          </div>
        </div>
      </article>

      <section className="hud-panel p-5">
        <h2 className="mb-3 font-display text-lg uppercase tracking-wider text-gold">Drop your transmission</h2>
        <div className="flex gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2}
            placeholder="Share intel…"
            className="flex-1 rounded-md border border-border bg-background/60 p-2 font-mono text-sm outline-none focus:border-gold/60" />
          <button onClick={submit} disabled={sending || !text.trim()}
            className="self-end rounded-md border border-gold bg-gold/20 px-4 py-2 font-hud text-xs font-bold uppercase tracking-wider text-gold transition hover:bg-gold/30 disabled:opacity-50">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {comments.length === 0 && <p className="font-mono text-xs text-foreground/50">No comments yet. Be the first.</p>}
          {comments.map((c) => (
            <div key={c.id} className="rounded-md border border-border/60 bg-background/40 p-3">
              <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-foreground/60">
                <span className="text-gold">{c.username ?? "operative"}</span>
                <span>·</span>
                <span>{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="font-mono text-sm text-foreground/85 whitespace-pre-wrap">{c.comment_text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
