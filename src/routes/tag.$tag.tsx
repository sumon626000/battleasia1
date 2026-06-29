import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Hash, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/tag/$tag")({
  head: ({ params }) => ({
    meta: [
      { title: `#${params.tag} — Battle Asia` },
      { name: "description", content: `Posts tagged with #${params.tag} on Battle Asia feed.` },
    ],
  }),
  component: TagView,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl p-6 font-hud text-sm text-red-400">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl p-6 font-hud text-sm text-foreground/60">Tag not found.</div>
  ),
});

type Row = {
  id: string;
  caption: string | null;
  media_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

function TagView() {
  const { tag } = Route.useParams();
  const [items, setItems] = useState<Row[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Fast path: normalized hashtag join (uses indexes; no full-table ILIKE)
      const { data: ht } = await supabase
        .from("social_hashtags")
        .select("id")
        .eq("tag", tag.toLowerCase())
        .maybeSingle();
      if (!ht) {
        if (mounted) setItems([]);
        return;
      }
      const { data: links } = await supabase
        .from("social_post_hashtags")
        .select("post_id")
        .eq("hashtag_id", ht.id)
        .order("created_at", { ascending: false })
        .limit(60);
      const ids = (links ?? []).map((r: { post_id: string }) => r.post_id);
      if (ids.length === 0) {
        if (mounted) setItems([]);
        return;
      }
      const { data } = await supabase
        .from("social_posts")
        .select("id,caption,media_url,likes_count,comments_count,created_at")
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      setItems((data ?? []) as Row[]);
    })();
    return () => {
      mounted = false;
    };
  }, [tag]);


  return (
    <div className="mx-auto max-w-3xl px-3 pb-20 pt-3">
      <div className="mb-3 flex items-center gap-3">
        <Link to="/feed" className="grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-card/50 text-foreground/80 hover:text-gold">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 bg-card/60 text-gold">
            <Hash size={18} />
          </span>
          <div>
            <h1 className="font-hud text-lg font-bold text-foreground">#{tag}</h1>
            <p className="font-hud text-[10px] uppercase tracking-wider text-foreground/50">
              {items ? `${items.length} post${items.length === 1 ? "" : "s"}` : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {items && items.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-card/40 p-8 text-center font-hud text-sm text-foreground/60">
          No posts tagged #{tag} yet.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {(items ?? []).map((p) => (
            <Link
              key={p.id}
              to="/post/$postId"
              params={{ postId: p.id }}
              className="group relative block aspect-square overflow-hidden rounded-md border border-border/60 bg-card/60"
            >
              {p.media_url ? (
                <img
                  src={p.media_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-2 text-center font-hud text-[10px] text-foreground/60">
                  {(p.caption ?? "").slice(0, 60) || "Post"}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
