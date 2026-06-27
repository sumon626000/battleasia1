import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Eye, Heart, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/news")({
  component: PublicNewsPage,
  head: () => ({
    meta: [
      { title: "News & Updates — Battle Asia" },
      { name: "description", content: "Latest tournament results, patch notes, and esports news from Battle Asia." },
    ],
  }),
});

type Post = {
  id: number;
  title: string;
  description_html: string | null;
  cover_image_url: string | null;
  published_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
};

function PublicNewsPage() {
  const q = useQuery({
    queryKey: ["public-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("id, title, description_html, cover_image_url, published_at, views_count, likes_count, comments_count")
        .eq("status", "Published")
        .eq("premium_only", false)
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 hud-bracket pl-3">
        <Newspaper className="h-7 w-7 text-gold" />
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wider text-gold">News & Updates</h1>
          <p className="text-xs text-foreground/60 font-hud uppercase tracking-widest">Latest from the front lines</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {q.data?.map((p) => {
          const excerpt = (p.description_html ?? "").replace(/<[^>]+>/g, "").slice(0, 160);
          return (
            <Link
              key={p.id}
              to="/dashboard/feed/$postId"
              params={{ postId: String(p.id) }}
              className="hud-panel group overflow-hidden hover:border-gold/60 transition"
            >
              {p.cover_image_url && (
                <div className="h-44 overflow-hidden">
                  <img loading="lazy" decoding="async" src={p.cover_image_url} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <h3 className="font-display text-lg uppercase tracking-wide text-foreground line-clamp-2">{p.title}</h3>
                <p className="text-sm text-foreground/70 line-clamp-3">{excerpt}</p>
                <div className="flex items-center gap-4 pt-2 text-[11px] text-foreground/50 font-hud uppercase tracking-widest">
                  <span>{new Date(p.published_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Eye size={11} /> {p.views_count}</span>
                  <span className="flex items-center gap-1"><Heart size={11} /> {p.likes_count}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={11} /> {p.comments_count}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {q.data?.length === 0 && (
        <div className="hud-panel p-12 text-center text-foreground/60">No published news yet.</div>
      )}
    </div>
  );
}
