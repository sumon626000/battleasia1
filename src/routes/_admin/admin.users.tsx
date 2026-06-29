import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search, ShieldCheck, ShieldOff, Coins, UserX, UserCheck, X, Download,
  Columns3, Filter, Rows3, MoreVertical, Trash2, RotateCcw,
} from "lucide-react";
import { exportRowsAsCSV } from "@/lib/csv";

const RESET_SCOPES = [
  { key: "balance_logs", label: "Balance History" },
  { key: "matches", label: "Match Participation" },
  { key: "deposits", label: "Deposits" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "shop", label: "Shop Purchases" },
  { key: "referrals", label: "Referrals" },
  { key: "login_history", label: "Login History" },
  { key: "notifications", label: "Notifications" },
  { key: "feed", label: "Feed Posts / Likes / Comments" },
  { key: "stories", label: "Stories" },
  { key: "messages", label: "Direct Messages" },
  { key: "security", label: "Security Alerts" },
  { key: "online_sessions", label: "Online Sessions" },
  { key: "support", label: "Support Tickets" },
] as const;

export const Route = createFileRoute("/_admin/admin/users")({
  component: AdminUsers,
});

type Row = {
  id: string;
  username: string | null;
  in_game_username: string | null;
  pubg_id: string | null;
  country_code: string | null;
  mobile_number: string | null;
  game_server: string | null;
  referral_code: string | null;
  bac_coin_balance: number | null;
  is_premium: boolean | null;
  is_suspended: boolean | null;
  suspension_reason: string | null;
  created_at: string;
  roles: { role: string }[];
};

const ALL_COLUMNS = [
  { key: "actions", label: "Actions" },
  { key: "id", label: "User ID" },
  { key: "user", label: "User" },
  { key: "role", label: "Role" },
  { key: "balance", label: "Balance" },
  { key: "pubg_id", label: "PUBG ID" },
  { key: "country", label: "Country Code" },
  { key: "mobile", label: "Mobile" },
  { key: "game_server", label: "Game Server" },
  { key: "referral", label: "Referral Code" },
  { key: "status", label: "Status" },
  { key: "joined", label: "Joined" },
] as const;
type ColKey = (typeof ALL_COLUMNS)[number]["key"];

async function fetchUsers(q: string) {
  let query = supabase
    .from("profiles")
    .select(
      "id, username, in_game_username, pubg_id, country_code, mobile_number, game_server, referral_code, bac_coin_balance, is_premium, is_suspended, suspension_reason, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (q.trim()) {
    const pattern = `%${q.trim()}%`;
    query = query.or(
      `username.ilike.${pattern},in_game_username.ilike.${pattern},pubg_id.ilike.${pattern},mobile_number.ilike.${pattern},referral_code.ilike.${pattern}`
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
  user, onClose, isSuper,
}: { user: Row; onClose: () => void; isSuper: boolean }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [role, setRole] = useState(user.roles?.[0]?.role ?? "user");
  const [busy, setBusy] = useState(false);
  const [resetScopes, setResetScopes] = useState<Record<string, boolean>>({});
  const toggleScope = (k: string) => setResetScopes((s) => ({ ...s, [k]: !s[k] }));
  const allScopesSelected = RESET_SCOPES.every((s) => resetScopes[s.key]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); refresh(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4">
      <div className="hud-panel relative w-full max-w-lg rounded-md border border-gold/40 bg-card p-5">
        <button onClick={onClose} className="absolute right-3 top-3 text-foreground/60 hover:text-foreground"><X size={18} /></button>
        <h3 className="font-display text-lg uppercase tracking-widest text-gold">
          {user.in_game_username ?? user.username ?? "Operative"}
        </h3>
        <p className="font-mono text-[11px] text-foreground/50">PUBG: {user.pubg_id ?? "—"} · {user.id.slice(0, 8)}</p>

        <div className="mt-4 space-y-4">
          <div className="border-t border-border/40 pt-3">
            <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">Role {isSuper ? "" : "(super admin only)"}</label>
            <div className="mt-2 flex gap-2">
              <select value={role} disabled={!isSuper} onChange={(e) => setRole(e.target.value)}
                className="flex-1 rounded border border-border bg-background px-2 py-1.5 font-hud text-sm disabled:opacity-50">
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="sub_admin">Sub Admin</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <button disabled={busy || !isSuper}
                onClick={() => run(async () => {
                  const { error } = await supabase.rpc("admin_set_user_role", { p_user_id: user.id, p_role: role as never });
                  if (error) throw error;
                }, "Role updated")}
                className="rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20 disabled:opacity-50">Apply</button>
            </div>
          </div>

          <div className="border-t border-border/40 pt-3">
            <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              {user.is_suspended ? "Restore Access" : "Suspend Account"}
            </label>
            {!user.is_suspended ? (
              <div className="mt-2 flex gap-2">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason"
                  className="flex-1 rounded border border-border bg-background px-2 py-1.5 font-hud text-sm" />
                <button disabled={busy || !reason.trim()}
                  onClick={() => run(async () => {
                    const { error } = await supabase.rpc("admin_suspend_user", { p_user_id: user.id, p_reason: reason });
                    if (error) throw error;
                  }, "User suspended")}
                  className="rounded border border-destructive/60 bg-destructive/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-destructive hover:bg-destructive/20 disabled:opacity-50">Suspend</button>
              </div>
            ) : (
              <button disabled={busy}
                onClick={() => run(async () => {
                  const { error } = await supabase.rpc("admin_unsuspend_user", { p_user_id: user.id });
                  if (error) throw error;
                }, "Access restored")}
                className="mt-2 rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20">Restore Access</button>
            )}
          </div>

          <div className="border-t border-border/40 pt-3">
            <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              Adjust BAC Balance (current: {Number(user.bac_coin_balance ?? 0).toLocaleString()})
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="+100 or -50"
                className="rounded border border-border bg-background px-2 py-1.5 font-hud text-sm" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note"
                className="rounded border border-border bg-background px-2 py-1.5 font-hud text-sm" />
            </div>
            <button disabled={busy || !delta || !note.trim()}
              onClick={() => run(async () => {
                const d = Number(delta);
                if (!Number.isFinite(d) || d === 0) throw new Error("Invalid amount");
                const { error } = await supabase.rpc("admin_adjust_balance", { p_user_id: user.id, p_delta: d, p_note: note });
                if (error) throw error;
              }, "Balance adjusted")}
              className="mt-2 rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20 disabled:opacity-50">
              <Coins className="mr-1 inline h-3 w-3" /> Adjust
            </button>
          </div>

          <div className="border-t border-border/40 pt-3">
            <div className="flex items-center justify-between">
              <label className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                Reset History
              </label>
              <button
                type="button"
                onClick={() =>
                  setResetScopes(
                    allScopesSelected
                      ? {}
                      : Object.fromEntries(RESET_SCOPES.map((s) => [s.key, true])),
                  )
                }
                className="font-hud text-[10px] uppercase tracking-widest text-gold hover:underline"
              >
                {allScopesSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 rounded border border-border/50 bg-background/40 p-2">
              {RESET_SCOPES.map((s) => (
                <label key={s.key} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-secondary/40">
                  <input
                    type="checkbox"
                    checked={!!resetScopes[s.key]}
                    onChange={() => toggleScope(s.key)}
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </div>
            <button
              disabled={busy || !Object.values(resetScopes).some(Boolean)}
              onClick={() => {
                const scopes = Object.entries(resetScopes).filter(([, v]) => v).map(([k]) => k);
                if (!scopes.length) return;
                if (!window.confirm(`Permanently delete the selected history (${scopes.length} type${scopes.length > 1 ? "s" : ""}) for this user? This cannot be undone.`)) return;
                run(async () => {
                  const { error } = await supabase.rpc("admin_reset_user_history", {
                    p_user_id: user.id,
                    p_scopes: scopes,
                  });
                  if (error) throw error;
                  setResetScopes({});
                }, "History reset");
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded border border-destructive/60 bg-destructive/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-destructive hover:bg-destructive/20 disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" /> Reset Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Popover({ open, onClose, children, align = "left" }: { open: boolean; onClose: () => void; children: React.ReactNode; align?: "left" | "right" }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`absolute z-50 mt-2 ${align === "right" ? "right-0" : "left-0"} min-w-[240px] rounded-md border border-border/70 bg-popover p-2 shadow-xl`}>
        {children}
      </div>
    </>
  );
}

function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [visible, setVisible] = useState<Record<ColKey, boolean>>(() =>
    Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, true])) as Record<ColKey, boolean>
  );
  const [colSearch, setColSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<"cols" | "filters" | "density" | "more" | null>(null);
  const [density, setDensity] = useState<"compact" | "standard" | "comfortable">("standard");
  const [fRole, setFRole] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fPremium, setFPremium] = useState<string>("all");
  const [fDateStart, setFDateStart] = useState<string>("");
  const [fDateEnd, setFDateEnd] = useState<string>("");

  const { data: isSuper = false } = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_super_admin");
      return !!data;
    },
  });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => fetchUsers(q),
  });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (fRole !== "all") rows = rows.filter((r) => (r.roles?.[0]?.role ?? "user") === fRole);
    if (fStatus === "active") rows = rows.filter((r) => !r.is_suspended);
    if (fStatus === "suspended") rows = rows.filter((r) => !!r.is_suspended);
    if (fPremium === "yes") rows = rows.filter((r) => !!r.is_premium);
    if (fPremium === "no") rows = rows.filter((r) => !r.is_premium);
    if (fDateStart) {
      const t = new Date(fDateStart).getTime();
      rows = rows.filter((r) => new Date(r.created_at).getTime() >= t);
    }
    if (fDateEnd) {
      const t = new Date(fDateEnd).getTime() + 86400000 - 1;
      rows = rows.filter((r) => new Date(r.created_at).getTime() <= t);
    }
    return rows;
  }, [data, fRole, fStatus, fPremium, fDateStart, fDateEnd]);

  const rowPad = density === "compact" ? "py-1" : density === "comfortable" ? "py-3" : "py-2";

  const colsList = ALL_COLUMNS.filter((c) =>
    c.label.toLowerCase().includes(colSearch.toLowerCase())
  );
  const show = (k: ColKey) => visible[k];

  const exportCSV = () => {
    const rows = filtered.map((u) => ({
      id: u.id,
      username: u.username ?? "",
      in_game_username: u.in_game_username ?? "",
      pubg_id: u.pubg_id ?? "",
      country_code: u.country_code ?? "",
      mobile: u.mobile_number ?? "",
      game_server: u.game_server ?? "",
      referral_code: u.referral_code ?? "",
      bac_balance: Number(u.bac_coin_balance ?? 0),
      role: u.roles?.[0]?.role ?? "user",
      is_premium: !!u.is_premium,
      is_suspended: !!u.is_suspended,
      created_at: u.created_at,
    }));
    if (!rows.length) return toast.error("Nothing to export");
    exportRowsAsCSV(`users-${Date.now()}`, rows);
  };

  const deleteAll = async () => {
    if (!isSuper) return toast.error("Super admin only");
    const ok = window.prompt('Type "DELETE ALL" to permanently remove every non-staff user');
    if (ok !== "DELETE ALL") return;
    try {
      const { data: n, error } = await supabase.rpc("admin_delete_all_non_admin_users");
      if (error) throw error;
      toast.success(`Deleted ${n ?? 0} user(s)`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toolBtn = "inline-flex items-center gap-1.5 rounded border border-border/70 px-2.5 py-1.5 font-hud text-[10px] uppercase tracking-widest text-foreground/70 hover:border-gold hover:text-gold";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.2em]">User Roster</h1>
          <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
            Manage operatives, roles, and access · {filtered.length} shown
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username / PUBG ID / mobile / referral"
            className="rounded border border-border bg-background pl-8 pr-3 py-1.5 font-hud text-sm w-80" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="hud-panel flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-card/40 px-3 py-2">
        {/* Columns */}
        <div className="relative">
          <button className={toolBtn} onClick={() => setOpenMenu(openMenu === "cols" ? null : "cols")}>
            <Columns3 className="h-3.5 w-3.5" /> Columns
          </button>
          <Popover open={openMenu === "cols"} onClose={() => setOpenMenu(null)}>
            <div className="mb-2 flex items-center gap-2 rounded border border-border/60 bg-background px-2 py-1">
              <Search className="h-3 w-3 text-foreground/40" />
              <input autoFocus value={colSearch} onChange={(e) => setColSearch(e.target.value)} placeholder="Search"
                className="w-full bg-transparent text-xs outline-none" />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {colsList.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary/40">
                  <input type="checkbox" checked={visible[c.key]} onChange={(e) =>
                    setVisible((v) => ({ ...v, [c.key]: e.target.checked }))} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox"
                  checked={ALL_COLUMNS.every((c) => visible[c.key])}
                  onChange={(e) => setVisible(Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, e.target.checked])) as Record<ColKey, boolean>)} />
                Show/Hide All
              </label>
              <button onClick={() => setVisible(Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, true])) as Record<ColKey, boolean>)}
                className="text-gold hover:underline">Reset</button>
            </div>
          </Popover>
        </div>

        {/* Filters */}
        <div className="relative">
          <button className={toolBtn} onClick={() => setOpenMenu(openMenu === "filters" ? null : "filters")}>
            <Filter className="h-3.5 w-3.5" /> Filters
            {(fRole !== "all" || fStatus !== "all" || fPremium !== "all" || fDateStart || fDateEnd) && (
              <span className="ml-1 rounded bg-gold/20 px-1 text-[9px] text-gold">ON</span>
            )}
          </button>
          <Popover open={openMenu === "filters"} onClose={() => setOpenMenu(null)}>
            <div className="space-y-2 p-1 text-xs">
              <div>
                <div className="mb-1 font-hud text-[10px] uppercase tracking-widest text-foreground/60">Role</div>
                <select value={fRole} onChange={(e) => setFRole(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1 text-sm">
                  <option value="all">All</option>
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="sub_admin">Sub Admin</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <div className="mb-1 font-hud text-[10px] uppercase tracking-widest text-foreground/60">Status</div>
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1 text-sm">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <div className="mb-1 font-hud text-[10px] uppercase tracking-widest text-foreground/60">Premium</div>
                <select value={fPremium} onChange={(e) => setFPremium(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1 text-sm">
                  <option value="all">All</option>
                  <option value="yes">Premium</option>
                  <option value="no">Free</option>
                </select>
              </div>
              <div>
                <div className="mb-1 font-hud text-[10px] uppercase tracking-widest text-foreground/60">Registered Date</div>
                <div className="flex items-center gap-1">
                  <input type="date" value={fDateStart} onChange={(e) => setFDateStart(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                  <span className="text-foreground/50">–</span>
                  <input type="date" value={fDateEnd} onChange={(e) => setFDateEnd(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-sm" />
                </div>
              </div>
              <button onClick={() => { setFRole("all"); setFStatus("all"); setFPremium("all"); setFDateStart(""); setFDateEnd(""); }}
                className="w-full rounded border border-border/60 px-2 py-1 text-[10px] uppercase tracking-widest hover:border-gold hover:text-gold">
                Reset Filters
              </button>
            </div>
          </Popover>
        </div>

        {/* Density */}
        <div className="relative">
          <button className={toolBtn} onClick={() => setOpenMenu(openMenu === "density" ? null : "density")}>
            <Rows3 className="h-3.5 w-3.5" /> Density
          </button>
          <Popover open={openMenu === "density"} onClose={() => setOpenMenu(null)}>
            {(["compact", "standard", "comfortable"] as const).map((d) => (
              <button key={d} onClick={() => { setDensity(d); setOpenMenu(null); }}
                className={`block w-full rounded px-2 py-1 text-left text-sm capitalize hover:bg-secondary/40 ${density === d ? "text-gold" : ""}`}>
                {d}
              </button>
            ))}
          </Popover>
        </div>

        {/* Export */}
        <button className={toolBtn} onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> Export
        </button>

        {/* More: Delete all users */}
        <div className="relative ml-auto">
          <button className={toolBtn} onClick={() => setOpenMenu(openMenu === "more" ? null : "more")}>
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          <Popover open={openMenu === "more"} onClose={() => setOpenMenu(null)} align="right">
            <button disabled={!isSuper}
              onClick={() => { setOpenMenu(null); deleteAll(); }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" /> Delete all users
              {!isSuper && <span className="ml-auto text-[9px] text-foreground/50">super admin</span>}
            </button>
          </Popover>
        </div>
      </div>

      <div className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              {show("actions") && <th className="px-3 py-2">Actions</th>}
              {show("id") && <th className="px-3 py-2">User ID</th>}
              {show("user") && <th className="px-3 py-2">User</th>}
              {show("role") && <th className="px-3 py-2">Role</th>}
              {show("balance") && <th className="px-3 py-2">Balance</th>}
              {show("pubg_id") && <th className="px-3 py-2">PUBG ID</th>}
              {show("country") && <th className="px-3 py-2">Country</th>}
              {show("mobile") && <th className="px-3 py-2">Mobile</th>}
              {show("game_server") && <th className="px-3 py-2">Server</th>}
              {show("referral") && <th className="px-3 py-2">Referral</th>}
              {show("status") && <th className="px-3 py-2">Status</th>}
              {show("joined") && <th className="px-3 py-2">Joined</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={12} className="px-3 py-6 text-center text-foreground/50">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={12} className="px-3 py-6 text-center text-foreground/50">No users found.</td></tr>
            )}
            {filtered.map((u) => {
              const role = u.roles?.[0]?.role ?? "user";
              return (
                <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/30">
                  {show("actions") && (
                    <td className={`px-3 ${rowPad}`}>
                      <button onClick={() => setSelected(u)}
                        className="rounded border border-gold/60 px-2 py-1 font-hud text-[10px] uppercase tracking-widest text-gold hover:bg-gold/10">
                        Manage
                      </button>
                    </td>
                  )}
                  {show("id") && <td className={`px-3 ${rowPad} font-mono text-[10px] text-foreground/50`}>{u.id.slice(0, 8)}</td>}
                  {show("user") && (
                    <td className={`px-3 ${rowPad}`}>
                      <div className="font-semibold text-foreground">{u.in_game_username ?? u.username ?? "—"}</div>
                      {u.username && u.in_game_username && (
                        <div className="font-mono text-[10px] text-foreground/50">@{u.username}</div>
                      )}
                    </td>
                  )}
                  {show("role") && (
                    <td className={`px-3 ${rowPad}`}>
                      <span className={`rounded px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest ${
                        role === "super_admin" ? "bg-gold/20 text-gold" :
                        role === "admin" ? "bg-destructive/20 text-destructive" :
                        role === "sub_admin" ? "bg-orange-500/20 text-orange-400" :
                        role === "moderator" ? "bg-cyan-500/20 text-cyan-400" :
                        "bg-secondary text-foreground/70"
                      }`}>
                        {role === "user" ? <ShieldOff className="mr-1 inline h-3 w-3" /> : <ShieldCheck className="mr-1 inline h-3 w-3" />}
                        {role}
                      </span>
                    </td>
                  )}
                  {show("balance") && (
                    <td className={`px-3 ${rowPad} font-mono tabular-nums text-gold`}>
                      {Number(u.bac_coin_balance ?? 0).toLocaleString()}
                    </td>
                  )}
                  {show("pubg_id") && <td className={`px-3 ${rowPad} font-mono text-xs`}>{u.pubg_id ?? "—"}</td>}
                  {show("country") && <td className={`px-3 ${rowPad} font-mono text-xs`}>{u.country_code ?? "—"}</td>}
                  {show("mobile") && <td className={`px-3 ${rowPad} font-mono text-xs`}>{u.mobile_number ?? "—"}</td>}
                  {show("game_server") && <td className={`px-3 ${rowPad} font-mono text-xs`}>{u.game_server ?? "—"}</td>}
                  {show("referral") && <td className={`px-3 ${rowPad} font-mono text-xs`}>{u.referral_code ?? "—"}</td>}
                  {show("status") && (
                    <td className={`px-3 ${rowPad}`}>
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
                        <span className="ml-1 rounded bg-gold/20 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-gold">Premium</span>
                      )}
                    </td>
                  )}
                  {show("joined") && (
                    <td className={`px-3 ${rowPad} font-mono text-[10px] text-foreground/60`}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && <ActionModal user={selected} onClose={() => setSelected(null)} isSuper={isSuper} />}
    </div>
  );
}
