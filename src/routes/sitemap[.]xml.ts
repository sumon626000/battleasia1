import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const STATIC = [
  "/",
  "/matches",
  "/leaderboard",
  "/news",
  "/shop",
  "/apk",
  "/support",
  "/auth",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const urls: string[] = STATIC.map((p) => origin + p);

        try {
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );
          const [pages, news] = await Promise.all([
            supabase.from("static_pages").select("slug").eq("is_published", true),
            supabase.from("feed_posts").select("id,slug").eq("status", "published").limit(500),
          ]);
          (pages.data ?? []).forEach((p: { slug: string }) => urls.push(`${origin}/p/${p.slug}`));
          (news.data ?? []).forEach((n: { id: string; slug: string | null }) =>
            urls.push(`${origin}/news`),
          );
        } catch {
          // best-effort; static sitemap still returned
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(new Set(urls))
  .map((u) => `  <url><loc>${u}</loc></url>`)
  .join("\n")}
</urlset>`;

        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
