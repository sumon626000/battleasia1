import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Ban, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/blocks")({
  component: BlocksPage,
});

function BlocksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["my-blocks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rels } = await supabase.from("user_blocks").select("blocked_id, created_at").eq("blocker_id", user!.id);
      const ids = (rels ?? []).map((r: any) => r.blocked_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids);
      return (profs ?? []).map((p: any) => ({ ...p, blocked_at: rels?.find((r: any) => r.blocked_id === p.id)?.created_at }));
    },
  });

  async function unblock(id: string) {
    const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", user!.id).eq("blocked_id", id);
    if (error) return toast.error(error.message);
    toast.success("Unblocked");
    qc.invalidateQueries({ queryKey: ["my-blocks", user?.id] });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <div className="hud-panel p-4 flex items-center gap-3">
        <ShieldOff className="h-5 w-5 text-gold" />
        <div>
          <h1 className="font-display uppercase tracking-widest text-lg text-gold">Blocked Users</h1>
          <p className="text-xs text-foreground/60 font-hud uppercase">Posts and profiles from these users are hidden from your feed.</p>
        </div>
      </div>

      <div className="hud-panel divide-y divide-border">
        {q.isLoading ? (
          <div className="p-8 text-center text-foreground/50 text-sm">Loading…</div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="p-12 text-center text-foreground/50 text-sm">You haven't blocked anyone.</div>
        ) : (
          q.data!.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt={u.username} className="h-11 w-11 rounded-full border border-border object-cover" />
              ) : (
                <div className="h-11 w-11 rounded-full bg-secondary border border-border" />
              )}
              <Link to="/u/$username" params={{ username: u.username }} className="flex-1 min-w-0">
                <div className="font-display text-sm text-foreground truncate">{u.username}</div>
                <div className="text-xs text-foreground/60 truncate">{u.display_name || "—"}</div>
              </Link>
              <button
                onClick={() => unblock(u.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs font-hud uppercase tracking-widest hover:border-gold hover:text-gold transition"
              >
                <Ban size={12} /> Unblock
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
