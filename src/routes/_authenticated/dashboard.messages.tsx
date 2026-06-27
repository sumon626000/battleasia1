import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  component: MessagesIndex,
});

function MessagesIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["dm-threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: threads, error } = await supabase
        .from("direct_threads")
        .select("id, user_a, user_b, last_message_at, created_at")
        .or(`user_a.eq.${user!.id},user_b.eq.${user!.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      const otherIds = (threads ?? []).map((t) => (t.user_a === user!.id ? t.user_b : t.user_a));
      if (!otherIds.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", otherIds);
      const pm = new Map((profs ?? []).map((p) => [p.id, p]));
      // get last message preview
      const ids = threads!.map((t) => t.id);
      const { data: lastMsgs } = await supabase
        .from("direct_messages")
        .select("thread_id, body, image_url, created_at, sender_id, read_at")
        .in("thread_id", ids)
        .order("created_at", { ascending: false });
      const lastByThread = new Map<string, any>();
      for (const m of lastMsgs ?? []) {
        if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, m);
      }
      return threads!.map((t) => ({
        ...t,
        other: pm.get(t.user_a === user!.id ? t.user_b : t.user_a),
        last: lastByThread.get(t.id),
      }));
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("dm-threads-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => q.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, q]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-gold" />
        <h1 className="font-display text-xl uppercase tracking-widest text-gold">Messages</h1>
      </div>
      <div className="hud-panel divide-y divide-border/60">
        {q.isLoading && <div className="p-6 text-center text-foreground/60 text-sm">Loading…</div>}
        {!q.isLoading && (q.data?.length ?? 0) === 0 && (
          <div className="p-10 text-center text-foreground/50 text-sm">
            No conversations yet. Open a player profile and tap Message to start one.
          </div>
        )}
        {(q.data ?? []).map((t: any) => {
          const unread = t.last && t.last.sender_id !== user!.id && !t.last.read_at;
          return (
            <button
              key={t.id}
              onClick={() => navigate({ to: "/dashboard/messages/$threadId", params: { threadId: t.id } })}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/40 transition"
            >
              {t.other?.avatar_url ? (
                <img src={t.other.avatar_url} alt="" className="h-12 w-12 rounded-full border border-border object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full border border-border bg-secondary" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display uppercase text-sm tracking-wide text-foreground truncate">
                    {t.other?.display_name || t.other?.username || "Player"}
                  </span>
                  {t.last && (
                    <span className="text-[10px] text-foreground/50 font-hud">
                      {new Date(t.last.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-xs ${unread ? "text-foreground font-semibold" : "text-foreground/60"}`}>
                    {t.last?.body || (t.last?.image_url ? "📷 Image" : "No messages yet")}
                  </span>
                  {unread && <span className="h-2 w-2 rounded-full bg-gold shrink-0" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-foreground/40 text-center font-hud uppercase tracking-widest">
        End-to-server encrypted via RLS. Be respectful.
      </p>
    </div>
  );
}
