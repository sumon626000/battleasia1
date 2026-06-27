import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/messages/$threadId")({
  component: ThreadChat,
});

function ThreadChat() {
  const { threadId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ["dm-thread", threadId],
    enabled: !!user,
    queryFn: async () => {
      const { data: thread, error } = await supabase
        .from("direct_threads")
        .select("id, user_a, user_b")
        .eq("id", threadId)
        .maybeSingle();
      if (error) throw error;
      if (!thread) throw new Error("Thread not found");
      const otherId = thread.user_a === user!.id ? thread.user_b : thread.user_a;
      const [{ data: other }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, avatar_url").eq("id", otherId).maybeSingle(),
        supabase.from("direct_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: true }).limit(500),
      ]);
      return { thread, other, msgs: msgs ?? [] };
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`dm-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `thread_id=eq.${threadId}` }, () => {
        qc.invalidateQueries({ queryKey: ["dm-thread", threadId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, threadId, qc]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
    // mark recipient messages as read
    if (user && q.data?.msgs?.length) {
      const unread = q.data.msgs.filter((m: any) => m.sender_id !== user.id && !m.read_at).map((m: any) => m.id);
      if (unread.length) {
        supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).in("id", unread).then();
      }
    }
  }, [q.data, user]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !body.trim() || sending) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    try {
      const { error } = await supabase.from("direct_messages").insert({
        thread_id: threadId,
        sender_id: user.id,
        body: text,
      });
      if (error) throw error;
      await supabase.from("direct_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
      qc.invalidateQueries({ queryKey: ["dm-thread", threadId] });
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
      setBody(text);
    } finally {
      setSending(false);
    }
  }

  if (q.isLoading) return <div className="p-12 text-center text-foreground/60">Loading…</div>;
  if (!q.data) return null;
  const { other, msgs } = q.data;

  return (
    <div className="mx-auto max-w-2xl flex flex-col h-[calc(100vh-9rem)]">
      <div className="hud-panel flex items-center gap-3 p-3 border-b border-border/60 rounded-b-none">
        <button onClick={() => navigate({ to: "/dashboard/messages" })} className="p-1 hover:text-gold">
          <ArrowLeft size={18} />
        </button>
        {other && (
          <Link to="/u/$username" params={{ username: other.username }} className="flex items-center gap-2 flex-1 group">
            {other.avatar_url ? (
              <img src={other.avatar_url} alt="" className="h-9 w-9 rounded-full border border-border object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-secondary border border-border" />
            )}
            <div>
              <div className="font-display uppercase text-sm tracking-wide group-hover:text-gold transition">{other.display_name || other.username}</div>
              <div className="text-[10px] text-foreground/50 font-hud uppercase">@{other.username}</div>
            </div>
          </Link>
        )}
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-3 py-4 space-y-2 bg-background/30 border-x border-border/60">
        {msgs.length === 0 && (
          <div className="text-center text-foreground/50 text-sm py-10 font-hud uppercase tracking-widest">Say hello 👋</div>
        )}
        {msgs.map((m: any) => {
          const mine = m.sender_id === user!.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                mine ? "bg-gold text-background" : "bg-secondary border border-border text-foreground"
              }`}>
                {m.body}
                <div className={`text-[9px] mt-1 font-hud uppercase tracking-wider ${mine ? "text-background/70" : "text-foreground/50"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="hud-panel flex items-center gap-2 p-2 rounded-t-none border-t border-border/60">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message…"
          className="flex-1 bg-background/60 rounded px-3 py-2 text-sm outline-none border border-border focus:border-gold/60"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="flex items-center gap-1 px-4 py-2 rounded bg-gold text-background font-hud text-xs uppercase tracking-widest disabled:opacity-50"
        >
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}
