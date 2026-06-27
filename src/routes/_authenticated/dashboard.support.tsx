import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LifeBuoy, MessageSquarePlus, Send, X, ChevronLeft, Clock } from "lucide-react";

type Ticket = {
  id: number;
  subject: string;
  status: "Open" | "Pending" | "Closed";
  unread_user: number;
  last_message_at: string | null;
  created_at: string;
};

type Message = {
  id: number;
  ticket_id: number;
  sender_type: "user" | "admin";
  sender_id: string;
  message: string;
  created_at: string;
};

function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("id,subject,status,unread_user,last_message_at,created_at")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, [user?.id]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", selected.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setMessages((data ?? []) as Message[]);
      });
    supabase.rpc("mark_ticket_read", { p_ticket_id: selected.id });

    const ch = supabase
      .channel(`ticket-${selected.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${selected.id}` },
        (payload) => setMessages((m) => [...m, payload.new as Message]),
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [selected?.id]);

  const submitNew = async () => {
    if (subject.trim().length < 3 || body.trim().length < 3) {
      toast.error("Subject and message required (min 3 chars)");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("create_support_ticket", {
      p_subject: subject.trim(),
      p_message: body.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Ticket created");
    setComposeOpen(false);
    setSubject("");
    setBody("");
    await loadTickets();
    if (data) {
      const fresh = await supabase.from("support_tickets").select("*").eq("id", data as number).maybeSingle();
      if (fresh.data) setSelected(fresh.data as Ticket);
    }
  };

  const sendReply = async () => {
    if (!selected || reply.trim().length === 0) return;
    setBusy(true);
    const { error } = await supabase.rpc("send_support_message", {
      p_ticket_id: selected.id,
      p_message: reply.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setReply("");
  };

  const closeTicket = async () => {
    if (!selected) return;
    const { error } = await supabase.rpc("close_support_ticket", { p_ticket_id: selected.id });
    if (error) return toast.error(error.message);
    toast.success("Ticket closed");
    setSelected({ ...selected, status: "Closed" });
    loadTickets();
  };

  const statusColor = (s: string) =>
    s === "Open" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" :
    s === "Pending" ? "bg-amber-500/15 text-amber-300 border-amber-500/40" :
    "bg-muted text-muted-foreground border-border";

  const counts = useMemo(() => ({
    open: tickets.filter(t => t.status === "Open").length,
    closed: tickets.filter(t => t.status === "Closed").length,
  }), [tickets]);

  return (
    <DashboardShell>
      <div className="space-y-5">
        <div className="hud-panel hud-bracket p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-gold/80">// Support Channel</div>
              <h1 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-gold">Command Help Desk</h1>
              <p className="text-sm text-muted-foreground">Open a ticket — our ops team replies within 24 hours.</p>
            </div>
            <Button className="btn-gold" onClick={() => setComposeOpen(true)}>
              <MessageSquarePlus className="mr-2 h-4 w-4" /> NEW TICKET
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Total" value={tickets.length} />
            <Stat label="Open" value={counts.open} />
            <Stat label="Closed" value={counts.closed} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="hud-panel p-3">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2 px-2">// Tickets</div>
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : tickets.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <LifeBuoy className="mx-auto mb-2 h-8 w-8 opacity-50" />
                No tickets yet
              </div>
            ) : (
              <ul className="space-y-1">
                {tickets.map((t) => {
                  const active = selected?.id === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelected(t)}
                        className={`w-full rounded-md border p-3 text-left transition ${
                          active ? "border-gold/60 bg-gold/10" : "border-border/60 hover:border-gold/40 hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-hud text-sm font-semibold uppercase tracking-wide text-foreground line-clamp-1">
                            #{t.id} · {t.subject}
                          </div>
                          {t.unread_user > 0 && (
                            <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-background">
                              {t.unread_user}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                          <Badge variant="outline" className={`${statusColor(t.status)} font-mono uppercase`}>{t.status}</Badge>
                          <span className="text-muted-foreground inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(t.last_message_at ?? t.created_at).toLocaleString()}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="hud-panel min-h-[400px] flex flex-col">
            {!selected ? (
              <div className="m-auto p-8 text-center text-muted-foreground">
                <LifeBuoy className="mx-auto mb-3 h-12 w-12 opacity-40" />
                Select a ticket to view conversation
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border/60 p-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setSelected(null)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold uppercase text-gold truncate">#{selected.id} · {selected.subject}</div>
                      <Badge variant="outline" className={`${statusColor(selected.status)} font-mono uppercase mt-1`}>{selected.status}</Badge>
                    </div>
                  </div>
                  {selected.status !== "Closed" && (
                    <Button variant="outline" size="sm" onClick={closeTicket}>
                      <X className="mr-1 h-3 w-3" /> Close
                    </Button>
                  )}
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[480px]">
                  {messages.map((m) => {
                    const mine = m.sender_type === "user";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg border p-3 text-sm ${
                          mine ? "border-gold/40 bg-gold/10" : "border-border bg-secondary/50"
                        }`}>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            {mine ? "You" : "Support"} · {new Date(m.created_at).toLocaleString()}
                          </div>
                          <div className="whitespace-pre-wrap text-foreground">{m.message}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {selected.status !== "Closed" ? (
                  <div className="border-t border-border/60 p-3 flex gap-2">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Type your reply…"
                      rows={2}
                      maxLength={4000}
                      className="flex-1"
                    />
                    <Button className="btn-gold self-end" onClick={sendReply} disabled={busy || !reply.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-t border-border/60 p-3 text-center text-xs text-muted-foreground font-mono uppercase tracking-wider">
                    Ticket closed — open a new one if needed
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {composeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setComposeOpen(false)}>
            <div className="hud-panel w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold uppercase text-gold">New Ticket</h2>
                <Button size="icon" variant="ghost" onClick={() => setComposeOpen(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Subject</label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Brief summary" />
                </div>
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Message</label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={6} placeholder="Describe your issue in detail…" />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Need policy info? See{" "}
                  <Link to="/p/$slug" params={{ slug: "terms" }} className="text-gold hover:underline">Terms</Link>,{" "}
                  <Link to="/p/$slug" params={{ slug: "refund" }} className="text-gold hover:underline">Refund Policy</Link>.
                </div>
                <Button className="btn-gold w-full" onClick={submitNew} disabled={busy}>
                  {busy ? "Submitting…" : "Submit Ticket"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/60 p-3 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-bold text-gold">{value}</div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/dashboard/support")({
  component: SupportPage,
});
