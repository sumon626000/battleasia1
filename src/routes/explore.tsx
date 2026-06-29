import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Hash, AtSign, Compass, Loader2, X, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/explore")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Explore — Battle Asia" },
      { name: "description", content: "Discover trending posts, players and hashtags on Battle Asia." },
    ],
  }),
  component: ExplorePage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl p-6 font-hud text-sm text-red-400">{error.message}</div>
  ),
});

type GridPost = {
  id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

type UserHit = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
type TagHit = { tag: string; count: number };

function extractTags(caption: string | null): string[] {
  if (!caption) return [];
  const out = new Set<string>();
  const re = /#([\p{L}0-9_]{2,30})/gu;
  let m;
  while ((m = re.exec(caption)) !== null) out.add(m[1].toLowerCase());
  return [...out];
}

function ExplorePage() {
  const navigate = useNavigate();
  const [grid, setGrid] = useState<GridPost[] | null>(null);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserHit[]>([]);
  const [tags, setTags] = useState<TagHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Load trending grid (most engagement in last 14d)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const since = new Date(Date.now() - 14 * 86400_000).toISOString();
      const { data } = await supabase
        .from("social_posts")
        .select("id,caption,media_url,media_type,likes_count,comments_count,created_at")
        .eq("visibility", "public")
        .gte("created_at", since)
        .order("likes_count", { ascending: false })
        .limit(60);
      if (!mounted) return;
      const list = (data ?? []) as GridPost[];
      // prefer posts that have media
      list.sort((a, b) => Number(!!b.media_url) - Number(!!a.media_url));
      setGrid(list);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Search debounce: users + hashtags
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const term = q.trim().replace(/^[#@]/, "");
    if (!term) {
      setUsers([]);
      setTags([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      const pattern = `%${term}%`;
      const [u, p] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
          .limit(8),
        supabase
          .from("social_posts")
          .select("caption")
          .ilike("caption", `%#${term}%`)
          .limit(80),
      ]);
      setUsers(((u.data ?? []) as UserHit[]).filter((x) => x.username || x.display_name));
      const counts = new Map<string, number>();
      for (const r of (p.data ?? []) as { caption: string | null }[]) {
        for (const t of extractTags(r.caption)) {
          if (t.includes(term.toLowerCase())) counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
      const tagList: TagHit[] = [...counts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setTags(tagList);
      setSearching(false);
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  const showResults = q.trim().length > 0;

  const hint = useMemo(() => {
    const t = q.trim();
    if (t.startsWith("#")) return "Hashtags";
    if (t.startsWith("@")) return "Players";
    return "Players & hashtags";
  }, [q]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    if (t.startsWith("#")) {
      navigate({ to: "/tag/$tag", params: { tag: t.slice(1) } });
    } else if (t.startsWith("@")) {
      navigate({ to: "/u/$username", params: { username: t.slice(1) } });
    } else if (tags[0]) {
      navigate({ to: "/tag/$tag", params: { tag: tags[0].tag } });
    } else if (users[0]?.username) {
      navigate({ to: "/u/$username", params: { username: users[0].username } });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-3 pb-20 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 bg-card/60 text-gold">
            <Compass size={18} />
          </span>
          <div>
            <h1 className="font-display text-xl font-black tracking-wider text-foreground">
              <span className="text-gold">EXPLORE</span>
            </h1>
            <p className="font-hud text-[10px] uppercase tracking-widest text-foreground/50">
              Trending drops · players · hashtags
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={onSubmit} className="relative mb-4">
        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-3 py-2 focus-within:border-gold/60">
          <Search size={16} className="text-foreground/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${hint}…  (try @name or #tag)`}
            className="w-full bg-transparent font-hud text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
            autoComplete="off"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="rounded-md p-1 text-foreground/50 hover:text-gold"
              aria-label="Clear"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {showResults && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[60vh] overflow-auto rounded-lg border border-border/70 bg-card/95 shadow-xl backdrop-blur">
            {searching && (
              <div className="flex items-center gap-2 px-3 py-2 font-hud text-xs text-foreground/60">
                <Loader2 size={14} className="animate-spin" /> Searching…
              </div>
            )}
            {!searching && users.length === 0 && tags.length === 0 && (
              <div className="px-3 py-3 font-hud text-xs text-foreground/60">No matches.</div>
            )}
            {users.length > 0 && (
              <div>
                <div className="px-3 py-1.5 font-hud text-[10px] uppercase tracking-widest text-foreground/40">Players</div>
                {users.map((u) => {
                  const handle = u.username || u.display_name || "player";
                  return (
                    <Link
                      key={u.id}
                      to="/u/$username"
                      params={{ username: handle }}
                      onClick={() => setQ("")}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gold/10"
                    >
                      <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-border/70 bg-background font-hud text-[10px] text-gold">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={handle} className="h-full w-full object-cover" />
                        ) : (
                          handle.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-hud text-sm font-bold text-foreground">
                          <AtSign size={12} className="-mt-0.5 mr-0.5 inline text-foreground/40" />
                          {handle}
                        </div>
                        {u.display_name && u.username && (
                          <div className="truncate font-hud text-[10px] text-foreground/50">{u.display_name}</div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {tags.length > 0 && (
              <div>
                <div className="px-3 py-1.5 font-hud text-[10px] uppercase tracking-widest text-foreground/40">Hashtags</div>
                {tags.map((t) => (
                  <Link
                    key={t.tag}
                    to="/tag/$tag"
                    params={{ tag: t.tag }}
                    onClick={() => setQ("")}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gold/10"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-gold/40 bg-card/60 text-gold">
                      <Hash size={14} />
                    </span>
                    <div className="min-w-0 flex-1 font-hud text-sm font-bold text-foreground">#{t.tag}</div>
                    <span className="font-hud text-[10px] text-foreground/50">{t.count} posts</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      {/* Grid */}
      {grid === null ? (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-md border border-border/60 bg-card/40" />
          ))}
        </div>
      ) : grid.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-card/40 p-8 text-center font-hud text-sm text-foreground/60">
          Nothing trending right now.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {grid.map((p) => (
            <Link
              key={p.id}
              to="/post/$postId"
              params={{ postId: p.id }}
              className="group relative block aspect-square overflow-hidden rounded-md border border-border/60 bg-card/60"
            >
              {p.media_url ? (
                <>
                  {p.media_type === "video" ? (
                    <>
                      <video
                        src={p.media_url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-white">
                        <Play size={12} fill="currentColor" />
                      </span>
                    </>
                  ) : (
                    <img
                      src={p.media_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center p-2 text-center font-hud text-[10px] text-foreground/60">
                  {(p.caption ?? "").slice(0, 60) || "Post"}
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 font-hud text-[10px] text-white opacity-0 transition group-hover:opacity-100">
                <span>♥ {p.likes_count}</span>
                <span>💬 {p.comments_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
