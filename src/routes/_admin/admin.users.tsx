import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff, Coins, UserX, UserCheck, X, Download } from "lucide-react";
import { exportRowsAsCSV } from "@/lib/csv";


export const Route = createFileRoute("/_admin/admin/users")({
  component: AdminUsers,
});

type Row = {
  id: string;
  username: string | null;
  in_game_username: string | null;
  pubg_id: string | null;
  country_code: string | null;
  bac_coin_balance: number | null;
  is_premium: boolean | null;
  is_suspended: boolean | null;
  suspension_reason: string | null;
  created_at: string;
  roles: { role: string }[];
};

async function fetchUsers(q: string) {
  let query = supabase
    .from("profiles")
    .select(
      "id, username, in_game_username, pubg_id, country_code, bac_coin_balance, is_premium, is_suspended, suspension_reason, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (q.trim()) {
    const pattern = `%${q.trim()}%`;
    query = query.or(
      `username.ilike.${pattern},in_game_username.ilike.${pattern},pubg_id.ilike.${pattern}`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.id);
  const roleMap = new Map<string, string>();
  if (ids.length) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role));
  }
  return (data ?? []).map((r) => ({
    ...r,
    roles: roleMap.has(r.id) ? [{ role: roleMap.get(r.id)! }] : [],
  })) as Row[];
}

function ActionModal({
  user,
  onClose,
}: {
  user: Row;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [role, setRole] = useState(user.roles?.[0]?.role ?? "user");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4">
      <div className="hud-panel relative w-full max-w-lg rounded-md border border-gold/40 bg-card p-5">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-foreground/60 hover:text-foreground"
        >
          <X size={18} />
        </button>
        <h3 className="font-display text-lg uppercase tracking-widest text-gold">
          {user.in_game_username ?? user.username ?? "Operative"}
        </h3>
        <p className="font-mono text-[11px] text-foreground/50">PUBG: {user.pubg_id ?? "—"} · {user.id.slice(0, 8)}</p>

        <div className="mt-4 space-y-4">
          {/* Role */}
          <div className="border-t border-border/40 pt-3">
            <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">Role</label>
            <div className="mt-2 flex gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex-1 rounded border border-border bg-background px-2 py-1.5 font-hud text-sm"
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    async () => {
                      const { error } = await supabase.rpc("admin_set_user_role", {
                        p_user_id: user.id,
                        // @ts-expect-error enum
                        p_role: role,
                      });
                      if (error) throw error;
                    },
                    "Role updated"
                  )
                }
                className="rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Suspend */}
          <div className="border-t border-border/40 pt-3">
            <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              {user.is_suspended ? "Restore Access" : "Suspend Account"}
            </label>
            {!user.is_suspended ? (
              <div className="mt-2 flex gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason"
                  className="flex-1 rounded border border-border bg-background px-2 py-1.5 font-hud text-sm"
                />
                <button
                  disabled={busy || !reason.trim()}
                  onClick={() =>
                    run(
                      async () => {
                        const { error } = await supabase.rpc("admin_suspend_user", {
                          p_user_id: user.id,
                          p_reason: reason,
                        });
                        if (error) throw error;
                      },
                      "User suspended"
                    )
                  }
                  className="rounded border border-destructive/60 bg-destructive/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  Suspend
                </button>
              </div>
            ) : (
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    async () => {
                      const { error } = await supabase.rpc("admin_unsuspend_user", {
                        p_user_id: user.id,
                      });
                      if (error) throw error;
                    },
                    "Access restored"
                  )
                }
                className="mt-2 rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20"
              >
                Restore Access
              </button>
            )}
          </div>

          {/* Balance */}
          <div className="border-t border-border/40 pt-3">
            <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              Adjust BAC Balance (current: {Number(user.bac_coin_balance ?? 0).toLocaleString()})
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="+100 or -50"
                className="rounded border border-border bg-background px-2 py-1.5 font-hud text-sm"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note"
                className="rounded border border-border bg-background px-2 py-1.5 font-hud text-sm"
              />
            </div>
            <button
              disabled={busy || !delta || !note.trim()}
              onClick={() =>
                run(
                  async () => {
                    const d = Number(delta);
                    if (!Number.isFinite(d) || d === 0) throw new Error("Invalid amount");
                    const { error } = await supabase.rpc("admin_adjust_balance", {
                      p_user_id: user.id,
                      p_delta: d,
                      p_note: note,
                    });
                    if (error) throw error;
                  },
                  "Balance adjusted"
                )
              }
              className="mt-2 rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20 disabled:opacity-50"
            >
              <Coins className="mr-1 inline h-3 w-3" /> Adjust
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => fetchUsers(q),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.2em]">User Roster</h1>
          <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
            Manage operatives, roles, and access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const rows = (data ?? []).map((u) => ({
                id: u.id,
                username: u.username ?? "",
                in_game_username: u.in_game_username ?? "",
                pubg_id: u.pubg_id ?? "",
                country_code: u.country_code ?? "",
                bac_balance: Number(u.bac_coin_balance ?? 0),
                role: u.roles?.[0]?.role ?? "user",
                is_premium: !!u.is_premium,
                is_suspended: !!u.is_suspended,
                created_at: u.created_at,
              }));
              if (!rows.length) return;
              exportRowsAsCSV(`users-${Date.now()}`, rows);
            }}
            className="inline-flex items-center gap-1 rounded border border-border/70 px-3 py-1.5 font-hud text-[10px] uppercase tracking-widest text-foreground/70 hover:border-gold hover:text-gold"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search username / PUBG ID"
              className="rounded border border-border bg-background pl-8 pr-3 py-1.5 font-hud text-sm w-64"
            />
          </div>
        </div>

      </div>

      <div className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">PUBG ID</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">BAC</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-foreground/50">Loading…</td></tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-foreground/50">No users found.</td></tr>
            )}
            {(data ?? []).map((u) => {
              const role = u.roles?.[0]?.role ?? "user";
              return (
                <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-foreground">
                      {u.in_game_username ?? u.username ?? "—"}
                    </div>
                    <div className="font-mono text-[10px] text-foreground/50">{u.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{u.pubg_id ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest ${
                      role === "admin"
                        ? "bg-destructive/20 text-destructive"
                        : role === "moderator"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-secondary text-foreground/70"
                    }`}>
                      {role === "admin" ? <ShieldCheck className="mr-1 inline h-3 w-3" /> : <ShieldOff className="mr-1 inline h-3 w-3" />}
                      {role}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-gold">
                    {Number(u.bac_coin_balance ?? 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {u.is_suspended ? (
                      <span className="inline-flex items-center gap-1 rounded bg-destructive/20 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-destructive">
                        <UserX className="h-3 w-3" /> Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-emerald-400">
                        <UserCheck className="h-3 w-3" /> Active
                      </span>
                    )}
                    {u.is_premium && (
                      <span className="ml-1 rounded bg-gold/20 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-gold">
                        Premium
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground/60">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setSelected(u)}
                      className="rounded border border-gold/60 px-2 py-1 font-hud text-[10px] uppercase tracking-widest text-gold hover:bg-gold/10"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && <ActionModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
