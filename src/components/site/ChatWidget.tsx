import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, X, Send, Plus, Trash2 } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Thread = { id: string; title: string; updatedAt: number; messages: UIMessage[] };

const STORAGE_KEY = "ba_chatbot_threads_v1";
const ACTIVE_KEY = "ba_chatbot_active_v1";

function loadThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Thread[]) : [];
  } catch {
    return [];
  }
}
function saveThreads(t: Thread[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {}
}
function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function ChatWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Hide on admin routes
  if (pathname.startsWith("/admin")) return null;

  const { data: settings } = useQuery({
    queryKey: ["chatbot_settings_public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chatbot_settings")
        .select("enabled, welcome_message, bubble_title")
        .eq("id", 1)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const loaded = loadThreads();
    const active = (() => {
      try {
        return localStorage.getItem(ACTIVE_KEY);
      } catch {
        return null;
      }
    })();
    if (loaded.length === 0) {
      const t: Thread = { id: newId(), title: "New chat", updatedAt: Date.now(), messages: [] };
      setThreads([t]);
      setActiveId(t.id);
      saveThreads([t]);
    } else {
      setThreads(loaded);
      setActiveId(active && loaded.some((t) => t.id === active) ? active : loaded[0].id);
    }
  }, []);

  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);

  if (settings?.enabled === false) return null;

  function createThread() {
    const t: Thread = { id: newId(), title: "New chat", updatedAt: Date.now(), messages: [] };
    const next = [t, ...threads];
    setThreads(next);
    setActiveId(t.id);
    saveThreads(next);
    try {
      localStorage.setItem(ACTIVE_KEY, t.id);
    } catch {}
    setShowList(false);
  }

  function selectThread(id: string) {
    setActiveId(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {}
    setShowList(false);
  }

  function deleteThread(id: string) {
    const next = threads.filter((t) => t.id !== id);
    if (next.length === 0) {
      const t: Thread = { id: newId(), title: "New chat", updatedAt: Date.now(), messages: [] };
      next.push(t);
    }
    setThreads(next);
    saveThreads(next);
    if (activeId === id) setActiveId(next[0].id);
  }

  function updateActiveMessages(messages: UIMessage[]) {
    setThreads((curr) => {
      const next = curr.map((t) =>
        t.id === activeId
          ? {
              ...t,
              messages,
              updatedAt: Date.now(),
              title:
                t.title === "New chat" && messages[0]?.parts
                  ? (messages[0].parts
                      .map((p) => (p.type === "text" ? p.text : ""))
                      .join("")
                      .slice(0, 40) || "New chat")
                  : t.title,
            }
          : t,
      );
      saveThreads(next);
      return next;
    });
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-gold to-amber-600 text-black shadow-[0_8px_30px_-4px_rgba(255,193,7,0.55)] ring-1 ring-gold/60 transition-all hover:scale-110 hover:shadow-[0_10px_40px_-4px_rgba(255,193,7,0.75)] sm:bottom-8 sm:right-6 sm:h-16 sm:w-16"
          aria-label="Open support chat"
        >
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-gold/40 opacity-70 blur-md animate-pulse" />
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-gold/40 animate-ping" />
          <MessageCircle size={26} className="relative z-10 drop-shadow sm:size-7" />
          <span aria-hidden className="absolute -top-1 -right-1 z-10 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background" />
        </button>
      )}


      {open && active && (
        <div className="fixed bottom-24 right-4 z-[60] flex h-[600px] max-h-[80vh] w-[380px] max-w-[95vw] flex-col overflow-hidden rounded-xl border border-gold/40 bg-card shadow-2xl sm:bottom-8 sm:right-6">
          <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-gold/10 to-transparent px-3 py-2">
            <button
              onClick={() => setShowList((s) => !s)}
              className="font-display text-sm uppercase tracking-widest text-gold hover:underline truncate"
            >
              {settings?.bubble_title ?? "Support Assistant"}
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={createThread}
                title="New chat"
                className="rounded p-1 text-foreground/70 hover:text-gold"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-foreground/70 hover:text-gold"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {showList ? (
            <div className="flex-1 overflow-y-auto p-2">
              <div className="mb-2 px-1 font-hud text-[10px] uppercase tracking-widest text-muted-foreground">
                Conversations
              </div>
              {threads.map((t) => (
                <div
                  key={t.id}
                  className={`mb-1 flex items-center gap-2 rounded border px-2 py-1.5 text-xs ${
                    t.id === activeId
                      ? "border-gold/50 bg-gold/10"
                      : "border-border/50 hover:border-gold/30"
                  }`}
                >
                  <button
                    onClick={() => selectThread(t.id)}
                    className="flex-1 truncate text-left text-foreground/90"
                  >
                    {t.title}
                  </button>
                  <button
                    onClick={() => deleteThread(t.id)}
                    className="text-foreground/40 hover:text-destructive"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <ChatBody
              key={active.id}
              threadId={active.id}
              initialMessages={active.messages}
              welcomeMessage={settings?.welcome_message ?? "Hi! How can I help?"}
              onMessagesChange={updateActiveMessages}
            />
          )}
        </div>
      )}
    </>
  );
}

function ChatBody({
  threadId,
  initialMessages,
  welcomeMessage,
  onMessagesChange,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  welcomeMessage: string;
  onMessagesChange: (m: UIMessage[]) => void;
}) {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    onMessagesChange(messages);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId, status]);

  const busy = status === "submitted" || status === "streaming";

  async function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 text-sm text-foreground/90">
            {welcomeMessage}
          </div>
        )}
        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          const mine = m.role === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  mine
                    ? "bg-gold text-black"
                    : "border border-border/60 bg-secondary/40 text-foreground"
                }`}
              >
                {text || (busy && !mine ? "…" : "")}
              </div>
            </div>
          );
        })}
        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm text-foreground/60">
              Thinking…
            </div>
          </div>
        )}
        {error && (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            {error.message || "Something went wrong"}
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex items-end gap-2 border-t border-border/60 p-2"
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder="Type your message…"
          className="flex-1 resize-none rounded border border-border/60 bg-background/80 px-2 py-1.5 text-sm focus:border-gold focus:outline-none"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded bg-gold text-black disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </>
  );
}
