import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Story = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
};
type Author = { username: string | null; full_name: string | null; avatar_url: string | null };
type Group = { user_id: string; author: Author | null; stories: Story[] };

export function StoriesRail() {
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [viewer, setViewer] = useState<{ gi: number; si: number } | null>(null);

  async function load() {
    const { data: rows } = await supabase
      .from("social_stories")
      .select("id,user_id,media_url,media_type,caption,created_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(200);
    const list = (rows ?? []) as Story[];
    const ids = Array.from(new Set(list.map((s) => s.user_id)));
    let map: Record<string, Author> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .in("id", ids);
      map = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    const byUser = new Map<string, Group>();
    for (const s of list) {
      const g = byUser.get(s.user_id) ?? { user_id: s.user_id, author: map[s.user_id] ?? null, stories: [] };
      g.stories.push(s);
      byUser.set(s.user_id, g);
    }
    setGroups(Array.from(byUser.values()));
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("stories-rail")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_stories" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const open = (gi: number) => setViewer({ gi, si: 0 });
  const close = () => setViewer(null);

  // auto advance
  useEffect(() => {
    if (!viewer) return;
    const t = setTimeout(() => {
      const g = groups[viewer.gi];
      if (!g) return close();
      if (viewer.si + 1 < g.stories.length) setViewer({ gi: viewer.gi, si: viewer.si + 1 });
      else if (viewer.gi + 1 < groups.length) setViewer({ gi: viewer.gi + 1, si: 0 });
      else close();
    }, 5000);
    return () => clearTimeout(t);
  }, [viewer, groups]);

  return (
    <>
      <div className="mb-4 flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {isAuthenticated && (
          <Link
            to="/dashboard/story/new"
            className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
            aria-label="Add story"
          >
            <span className="relative grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-gold/60 bg-card/60 text-gold transition hover:border-gold">
              <Plus size={22} />
            </span>
            <span className="truncate font-hud text-[10px] uppercase tracking-wider text-foreground/60">Your story</span>
          </Link>
        )}
        {groups.map((g, gi) => {
          const handle = g.author?.username || g.author?.full_name || "player";
          const initials = handle.slice(0, 2).toUpperCase();
          return (
            <button
              key={g.user_id}
              onClick={() => open(gi)}
              className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-gold via-amber-500 to-rose-500 p-[2px]">
                <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-background font-hud text-xs font-bold text-gold">
                  {g.author?.avatar_url ? (
                    <img src={g.author.avatar_url} alt={handle} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </span>
              </span>
              <span className="w-full truncate text-center font-hud text-[10px] uppercase tracking-wider text-foreground/70">
                {handle}
              </span>
            </button>
          );
        })}
        {groups.length === 0 && !isAuthenticated && (
          <div className="font-hud text-[11px] uppercase tracking-wider text-foreground/40">No active stories</div>
        )}
      </div>

      {viewer && groups[viewer.gi] && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/95 p-4" onClick={close}>
          <div className="relative aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-xl border border-border/70 bg-black" onClick={(e) => e.stopPropagation()}>
            {/* progress bars */}
            <div className="absolute left-2 right-2 top-2 z-10 flex gap-1">
              {groups[viewer.gi].stories.map((_, i) => (
                <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                  <div className={`h-full bg-gold ${i < viewer.si ? "w-full" : i === viewer.si ? "w-full animate-[story_5s_linear]" : "w-0"}`} />
                </div>
              ))}
            </div>
            <div className="absolute left-3 top-5 z-10 flex items-center gap-2 text-white">
              <span className="font-hud text-xs font-bold drop-shadow">
                {groups[viewer.gi].author?.username || groups[viewer.gi].author?.full_name || "player"}
              </span>
            </div>
            <button onClick={close} className="absolute right-2 top-4 z-10 rounded-full p-1.5 text-white hover:bg-white/10" aria-label="Close">
              <X size={20} />
            </button>

            {(() => {
              const s = groups[viewer.gi].stories[viewer.si];
              return s.media_type === "video" ? (
                <video src={s.media_url} autoPlay playsInline className="h-full w-full object-contain" />
              ) : (
                <img src={s.media_url} alt="story" className="h-full w-full object-contain" />
              );
            })()}

            {groups[viewer.gi].stories[viewer.si].caption && (
              <div className="absolute bottom-6 left-4 right-4 z-10 rounded-lg bg-black/60 p-2.5 text-center font-hud text-sm text-white">
                {groups[viewer.gi].stories[viewer.si].caption}
              </div>
            )}

            {/* nav */}
            <button
              className="absolute left-0 top-0 z-0 h-full w-1/3"
              onClick={() =>
                setViewer((v) =>
                  v ? (v.si > 0 ? { gi: v.gi, si: v.si - 1 } : v.gi > 0 ? { gi: v.gi - 1, si: groups[v.gi - 1].stories.length - 1 } : v) : v,
                )
              }
              aria-label="Previous"
            />
            <button
              className="absolute right-0 top-0 z-0 h-full w-1/3"
              onClick={() =>
                setViewer((v) => {
                  if (!v) return v;
                  const g = groups[v.gi];
                  if (v.si + 1 < g.stories.length) return { gi: v.gi, si: v.si + 1 };
                  if (v.gi + 1 < groups.length) return { gi: v.gi + 1, si: 0 };
                  close();
                  return v;
                })
              }
              aria-label="Next"
            />
            <ChevronLeft className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-white/30" size={20} />
            <ChevronRight className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-white/30" size={20} />
          </div>
        </div>
      )}

      <style>{`@keyframes story { from { width: 0% } to { width: 100% } }`}</style>
    </>
  );
}
