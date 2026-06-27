import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Heart, MessageCircle, Eye, Crown, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/feed")({
  head: () => ({ meta: [{ title: "News & Feed — BattleAsia" }] }),
  component: FeedPage,
});

type Category = { id: number; name: string; slug: string };
type Post = {
  id: number;
  title: string;
  description_html: string;
  cover_image_url: string | null;
  category_id: number | null;
  premium_only: boolean;
  likes_count: number;
  comments_count: number;
  views_count: number;
  published_at: string | null;
};

function FeedPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("feed_categories").select("id,name,slug").is("deleted_at", null).order("id")
      .then(({ data }) => setCats((data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let q = supabase.from("feed_posts")
      .select("id,title,description_html,cover_image_url,category_id,premium_only,likes_count,comments_count,views_count,published_at")
      .eq("status", "Published").is("deleted_at", null)
      .order("published_at", { ascending: false }).limit(40);
    if (activeCat !== "all") q = q.eq("category_id", activeCat);
    q.then(({ data }) => { setPosts((data as Post[]) ?? []); setLoading(false); });
  }, [activeCat]);

  return (
    <div className="space-y-6">
      <div className="hud-panel p-5">
        <div className="flex items-center gap-3">
          <Newspaper className="text-gold" size={22} />
          <div>
            <h1 className="font-display text-2xl uppercase tracking-wider">Intel Feed</h1>
            <p className="font-mono text-xs text-foreground/60">Operational news, patch notes, guides &amp; events</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>ALL</CatChip>
        {cats.map((c) => (
          <CatChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>{c.name.toUpperCase()}</CatChip>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold" /></div>
      ) : posts.length === 0 ? (
        <div className="hud-panel p-10 text-center font-mono text-sm text-foreground/60">No transmissions in this channel.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((p) => <PostCard key={p.id} post={p} category={cats.find((c) => c.id === p.category_id)?.name} />)}
        </div>
      )}
    </div>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-md border px-3 py-1.5 font-hud text-xs font-bold uppercase tracking-wider transition ${
        active ? "border-gold bg-gold/15 text-gold" : "border-border bg-card/40 text-foreground/70 hover:border-gold/50 hover:text-gold"
      }`}>
      {children}
    </button>
  );
}

function PostCard({ post, category }: { post: Post; category?: string }) {
  const excerpt = post.description_html.replace(/<[^>]+>/g, "").slice(0, 140);
  return (
    <Link to="/dashboard/feed/$postId" params={{ postId: String(post.id) }}
      className="group hud-panel block overflow-hidden transition hover:border-gold/60">
      {post.cover_image_url && (
        <div className="aspect-video w-full overflow-hidden bg-secondary/40">
          <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-foreground/60">
          {category && <span className="rounded border border-gold/40 px-2 py-0.5 text-gold">{category}</span>}
          {post.premium_only && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/50 px-2 py-0.5 text-amber-400">
              <Crown size={10} /> PREMIUM
            </span>
          )}
          {post.published_at && <span>{new Date(post.published_at).toLocaleDateString()}</span>}
        </div>
        <h3 className="font-display text-lg uppercase leading-tight tracking-wide text-foreground group-hover:text-gold">
          {post.title}
        </h3>
        <p className="font-mono text-xs text-foreground/70">{excerpt}{excerpt.length === 140 ? "…" : ""}</p>
        <div className="flex items-center gap-4 border-t border-border/50 pt-3 font-mono text-xs text-foreground/60">
          <span className="inline-flex items-center gap-1"><Heart size={12} /> {post.likes_count}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle size={12} /> {post.comments_count}</span>
          <span className="inline-flex items-center gap-1"><Eye size={12} /> {post.views_count}</span>
        </div>
      </div>
    </Link>
  );
}
