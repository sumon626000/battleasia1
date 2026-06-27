import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

export const Route = createFileRoute("/u/$username/following")({
  component: FollowingPage,
});

function FollowingPage() {
  const { username } = Route.useParams();

  const q = useQuery({
    queryKey: ["follow-list", username, "following"],
    queryFn: async () => {
      const { data: prof } = await supabase.from("profiles").select("id, username").ilike("username", username).maybeSingle();
      if (!prof) return { profile: null, users: [] };
      const { data: rels } = await supabase.from("user_follows").select("following_id").eq("follower_id", prof.id);
      const ids = (rels ?? []).map((r: any) => r.following_id);
      if (ids.length === 0) return { profile: prof, users: [] };
      const { data: users } = await supabase.from("profiles").select("id, username, display_name, avatar_url, country_code").in("id", ids);
      return { profile: prof, users: users ?? [] };
    },
  });

  if (q.isLoading) return <div className="p-12 text-center text-foreground/60">Loading…</div>;
  if (!q.data?.profile) return <div className="p-12 text-center text-foreground/60">Player not found.</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
      <div className="hud-panel p-4 flex items-center gap-3">
        <Users className="h-5 w-5 text-gold" />
        <div>
          <h1 className="font-display uppercase tracking-widest text-lg text-gold">
            {q.data.profile.username} is following
          </h1>
          <p className="text-xs text-foreground/60 font-hud uppercase">{q.data.users.length} total</p>
        </div>
      </div>

      <div className="hud-panel divide-y divide-border">
        {q.data.users.length === 0 ? (
          <div className="p-12 text-center text-foreground/50 text-sm">Not following anyone yet.</div>
        ) : (
          q.data.users.map((u: any) => (
            <Link
              key={u.id}
              to="/u/$username"
              params={{ username: u.username }}
              className="flex items-center gap-3 p-3 hover:bg-secondary/40 transition"
            >
              {u.avatar_url ? (
                <img loading="lazy" src={u.avatar_url} alt={u.username} className="h-11 w-11 rounded-full border border-gold/40 object-cover" />
              ) : (
                <div className="h-11 w-11 rounded-full bg-secondary border border-border" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm text-foreground truncate">{u.username}</div>
                <div className="text-xs text-foreground/60 truncate">{u.display_name || u.country_code || "—"}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
