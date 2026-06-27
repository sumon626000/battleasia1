import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LifeBuoy, Send, X, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/support")({
  component: AdminSupportPage,
});

type Ticket = {
  id: number;
  user_id: string;
  subject: string;
  status: string;
  last_message_at: string | null;
  unread_admin: number;
  created_at: string;
  profiles?: { username: string | null; in_game_username: string | null; pubg_id: string | null } | null;
};

type Message = {
  id: number;
  ticket_id: number;
  sender_type: string;
  sender_id: string | null;
  message: string;
  created_at: string;
};

function AdminSupportPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const ticketsQ = useQuery({
    queryKey: ["admin-tickets", statusFilter, search],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("id, user_id, subject, status, last_message_at, unread_admin, created_at, profiles:profiles!support_tickets_user_id_fkey(username, in_game_username, pubg_id)")
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as "Open" | "Closed" | "Pending");
      if (search) q = q.ilike("subject", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Ticket[];
    },
  });

  const messagesQ = useQuery({
    queryKey: ["admin-ticket-messages", activeId],
    enabled: activeId !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", activeId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  useEffect(() => {
    if (activeId == null) return;
    supabase.rpc("mark_ticket_read", { p_ticket_id: activeId }).then(() => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    });
    const ch = supabase
      .channel(`admin-ticket-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${activeId}` }, () => {
        qc.invalidateQueries({ queryKey: ["admin-ticket-messages", activeId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeId, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQ.data?.length]);

  async function sendReply() {
    if (!activeId || !reply.trim()) return;
    const text = reply.trim();
    setReply("");
    const { error } = await supabase.rpc("send_support_message", { p_ticket_id: activeId, p_message: text });
    if (error) {
      toast.error(error.message);
      setReply(text);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-ticket-messages", activeId] });
  }

  async function setStatus(s: "Open" | "Closed" | "Pending") {
    if (!activeId) return;
    if (s === "Closed") {
      const { error } = await supabase.rpc("close_support_ticket", { p_ticket_id: activeId });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("support_tickets").update({ status: s }).eq("id", activeId);
      if (error) return toast.error(error.message);
    }
    toast.success(`Ticket ${s}`);
    qc.invalidateQueries({ queryKey: ["admin-tickets"] });
  }

  const activeTicket = ticketsQ.data?.find((t) => t.id === activeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <LifeBuoy className="h-6 w-6 text-gold" />
        <h1 className="font-display text-2xl uppercase tracking-widest text-gold">Support Center</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="hud-panel space-y-3 p-3">
          <div className="flex gap-2">
            {["all", "Open", "Pending", "Closed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded border px-2.5 py-1 font-hud text-[10px] uppercase tracking-widest ${
                  statusFilter === s ? "border-gold bg-gold/10 text-gold" : "border-border/60 text-foreground/70"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject..."
            className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-hud text-sm"
          />
          <div className="max-h-[70vh] space-y-1 overflow-y-auto">
            {ticketsQ.isLoading && <div className="p-3 text-xs text-foreground/60">Loading...</div>}
            {ticketsQ.data?.length === 0 && <div className="p-3 text-xs text-foreground/60">No tickets.</div>}
            {ticketsQ.data?.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full rounded border px-3 py-2 text-left transition ${
                  activeId === t.id ? "border-gold/60 bg-gold/10" : "border-border/60 hover:border-gold/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm truncate">{t.subject}</span>
                  {t.unread_admin > 0 && (
                    <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                      {t.unread_admin}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between font-hud text-[10px] uppercase tracking-wider text-foreground/60">
                  <span>{t.profiles?.username ?? "user"}</span>
                  <span>{t.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="hud-panel flex min-h-[70vh] flex-col p-3">
          {!activeTicket ? (
            <div className="m-auto flex flex-col items-center gap-2 text-foreground/60">
              <MessageSquare className="h-10 w-10" />
              <p className="font-hud text-sm uppercase tracking-widest">Select a ticket</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <div className="font-display text-base">{activeTicket.subject}</div>
                  <div className="font-hud text-[11px] uppercase tracking-wider text-foreground/60">
                    {activeTicket.profiles?.username} · PUBG: {activeTicket.profiles?.pubg_id ?? "—"} · {activeTicket.status}
                  </div>
                </div>
                <div className="flex gap-1">
                  {activeTicket.status !== "Open" && (
                    <button onClick={() => setStatus("Open")} className="rounded border border-border/60 px-2 py-1 font-hud text-[10px] uppercase">
                      Reopen
                    </button>
                  )}
                  {activeTicket.status !== "Closed" && (
                    <button onClick={() => setStatus("Closed")} className="rounded border border-destructive/60 px-2 py-1 font-hud text-[10px] uppercase text-destructive">
                      <X className="inline h-3 w-3" /> Close
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {messagesQ.data?.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-md border px-3 py-2 text-sm ${
                        m.sender_type === "admin" ? "border-gold/40 bg-gold/10" : "border-border/60 bg-card/60"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.message}</div>
                      <div className="mt-1 font-hud text-[10px] uppercase tracking-wider text-foreground/50">
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="mt-3 flex gap-2 border-t border-border/60 pt-3">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                  placeholder="Type a reply..."
                  className="flex-1 rounded border border-border/60 bg-background/60 px-3 py-2 font-hud text-sm"
                />
                <button onClick={sendReply} className="btn-tactical inline-flex items-center gap-2 px-4 py-2 text-xs uppercase">
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
