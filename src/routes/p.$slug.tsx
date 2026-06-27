import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Page = { slug: string; title: string; content_html: string; updated_at: string };

function StaticPage() {
  const { slug } = Route.useParams();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMissing(false);
    supabase
      .from("static_pages")
      .select("slug,title,content_html,updated_at")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (!data) setMissing(true);
        else setPage(data as Page);
        setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="hud-panel hud-bracket p-6 sm:p-8">
        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : missing ? (
          <div className="text-center py-10">
            <div className="font-display text-2xl font-bold uppercase text-gold mb-2">Page Not Found</div>
            <div className="text-sm text-muted-foreground">The page "{slug}" does not exist.</div>
          </div>
        ) : page ? (
          <>
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-gold/80">// Document</div>
            <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-wide text-gold">{page.title}</h1>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Updated {new Date(page.updated_at).toLocaleDateString()}
            </div>
            <div
              className="prose prose-invert mt-6 max-w-none text-foreground/90 [&_h2]:font-display [&_h2]:uppercase [&_h2]:text-gold [&_h3]:font-display [&_h3]:uppercase [&_h3]:text-foreground"
              dangerouslySetInnerHTML={{ __html: page.content_html }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/p/$slug")({
  component: StaticPage,
  head: ({ params }) => ({
    meta: [{ title: `${params.slug.toUpperCase()} — BattleAsia` }],
  }),
});
