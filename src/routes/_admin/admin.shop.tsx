import { useMemo, useState } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Package, Tag } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/shop")({
  component: AdminShopPage,
});

type Category = { id: number; name: string; slug: string; sort_order: number; deleted_at: string | null };
type Pkg = {
  id: number; title: string; bac_amount: number; price_currency: string; price_value: number;
  discount_percentage: number; category_id: number | null; image_url: string | null;
  is_active: boolean; sort_order: number; deleted_at: string | null;
};
type Purchase = {
  id: number; user_id: string; package_id: number; bac_amount: number;
  price_currency: string; price_value: number; transaction_id: string;
  sender_number_or_addr: string; status: string; created_at: string; admin_note: string | null;
};
type ProfileLite = { id: string; in_game_username: string | null; username: string | null };

function AdminShopPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"purchases" | "packages" | "categories">("purchases");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">Shop Operations</h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">Approve purchases, manage packages and categories</p>
      </div>

      <div className="flex gap-2">
        {(["purchases", "packages", "categories"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded border px-4 py-1.5 font-hud text-xs uppercase tracking-widest ${
              tab === t ? "border-gold/60 bg-gold/10 text-gold" : "border-border/60 text-foreground/70 hover:border-gold/40"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "purchases" && <PurchasesTab qc={qc} />}
      {tab === "packages" && <PackagesTab qc={qc} />}
      {tab === "categories" && <CategoriesTab qc={qc} />}
    </div>
  );
}

function PurchasesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-shop-purchases", statusFilter],
    queryFn: async () => {
      let q = supabase.from("shop_purchases").select("*").order("created_at", { ascending: false }).limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data: purchases, error } = await q;
      if (error) throw error;
      const ids = (purchases ?? []).map((p) => p.user_id);
      let profs: ProfileLite[] = [];
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("id, in_game_username, username").in("id", ids);
        profs = (data as ProfileLite[]) ?? [];
      }
      return { purchases: (purchases as Purchase[]) ?? [], profMap: new Map(profs.map((p) => [p.id, p])) };
    },
  });

  async function review(id: number, approve: boolean) {
    const note = prompt(approve ? "Optional approval note:" : "Reason for rejection:", "");
    if (!approve && !note) return;
    const { error } = await supabase.rpc("admin_review_shop_purchase", { p_id: id, p_approve: approve, p_note: note || undefined as never });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Purchase approved & BAC credited" : "Purchase rejected");
    qc.invalidateQueries({ queryKey: ["admin-shop-purchases"] });
  }

  return (
    <>
      <div className="flex gap-2">
        {["Pending", "Approved", "Rejected", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded border px-3 py-1 font-hud text-[10px] uppercase tracking-widest ${
              statusFilter === s ? "border-gold/60 bg-gold/10 text-gold" : "border-border/60 text-foreground/60"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">BAC</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">TX</th>
              <th className="px-3 py-2">Sender</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="px-3 py-6 text-center text-foreground/50">Loading…</td></tr>}
            {!isLoading && (data?.purchases.length ?? 0) === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-foreground/50">No purchases</td></tr>}
            {data?.purchases.map((p) => {
              const prof = data.profMap.get(p.user_id);
              return (
                <tr key={p.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-display">{prof?.in_game_username || prof?.username || p.user_id.slice(0, 8)}</td>
                  <td className="px-3 py-2 tabular-nums text-gold">{Number(p.bac_amount).toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{p.price_value} {p.price_currency}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{p.transaction_id}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{p.sender_number_or_addr}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground/60">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2"><StatusBadge s={p.status} /></td>
                  <td className="px-3 py-2 text-right">
                    {p.status === "Pending" && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => review(p.id, true)} className="rounded border border-emerald-500/50 px-2 py-1 text-emerald-400 hover:bg-emerald-500/10"><Check size={12} /></button>
                        <button onClick={() => review(p.id, false)} className="rounded border border-destructive/50 px-2 py-1 text-destructive hover:bg-destructive/10"><X size={12} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PackagesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [editing, setEditing] = useState<Partial<Pkg> | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-shop-packages"],
    queryFn: async () => {
      const [{ data: pkgs }, { data: cats }] = await Promise.all([
        supabase.from("shop_packages").select("*").is("deleted_at", null).order("sort_order"),
        supabase.from("shop_categories").select("id, name").is("deleted_at", null),
      ]);
      const catMap = new Map((cats ?? []).map((c) => [c.id, c.name]));
      return { pkgs: (pkgs as Pkg[]) ?? [], catMap };
    },
  });

  async function save() {
    if (!editing) return;
    const payload: Record<string, unknown> = { ...editing };
    delete (payload as { id?: number }).id;
    const { error } = await supabase.rpc("admin_save_shop_package", {
      p_id: (editing.id ?? null) as never, p_payload: payload as never,
    });
    if (error) return toast.error(error.message);
    toast.success("Package saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-shop-packages"] });
  }

  async function del(id: number) {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.rpc("admin_delete_shop_package", { p_id: id });
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-shop-packages"] });
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setEditing({ title: "", bac_amount: 100, price_currency: "BDT", price_value: 100, discount_percentage: 0, is_active: true, sort_order: 0 })}
          className="flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20">
          <Plus size={14} /> New Package
        </button>
      </div>
      <div className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            <tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">BAC</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Discount</th><th className="px-3 py-2">Active</th><th className="px-3 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="px-3 py-6 text-center text-foreground/50">Loading…</td></tr>}
            {data?.pkgs.map((p) => (
              <tr key={p.id} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2 font-display"><Package className="mr-2 inline h-3 w-3 text-gold" />{p.title}</td>
                <td className="px-3 py-2 text-foreground/70">{p.category_id ? data?.catMap.get(p.category_id) : "—"}</td>
                <td className="px-3 py-2 tabular-nums text-gold">{Number(p.bac_amount).toLocaleString()}</td>
                <td className="px-3 py-2 tabular-nums">{p.price_value} {p.price_currency}</td>
                <td className="px-3 py-2">{p.discount_percentage}%</td>
                <td className="px-3 py-2">{p.is_active ? <span className="text-emerald-400">ON</span> : <span className="text-foreground/50">OFF</span>}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(p)} className="rounded border border-border/60 px-2 py-1 hover:border-gold hover:text-gold"><Pencil size={12} /></button>
                    <button onClick={() => del(p.id)} className="rounded border border-border/60 px-2 py-1 hover:border-destructive hover:text-destructive"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={editing.id ? `Edit Package #${editing.id}` : "New Package"} onClose={() => setEditing(null)} onSave={save}>
          <Grid>
            <Field label="Title"><input className={inp} value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="BAC Amount"><input type="number" className={inp} value={editing.bac_amount ?? 0} onChange={(e) => setEditing({ ...editing, bac_amount: Number(e.target.value) })} /></Field>
            <Field label="Price Currency"><select className={inp} value={editing.price_currency ?? "BDT"} onChange={(e) => setEditing({ ...editing, price_currency: e.target.value })}>
              {["BDT", "INR", "USD"].map((c) => <option key={c}>{c}</option>)}
            </select></Field>
            <Field label="Price"><input type="number" className={inp} value={editing.price_value ?? 0} onChange={(e) => setEditing({ ...editing, price_value: Number(e.target.value) })} /></Field>
            <Field label="Discount %"><input type="number" className={inp} value={editing.discount_percentage ?? 0} onChange={(e) => setEditing({ ...editing, discount_percentage: Number(e.target.value) })} /></Field>
            <Field label="Category ID (optional)"><input type="number" className={inp} value={editing.category_id ?? ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Image"><ImageUploader value={editing.image_url} onChange={(u) => setEditing({ ...editing, image_url: u })} folder="shop" aspect="1/1" /></Field>
            <Field label="Sort Order"><input type="number" className={inp} value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-2 font-hud text-xs uppercase tracking-widest"><input type="checkbox" checked={!!editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
          </Grid>
        </Modal>
      )}
    </>
  );
}

function CategoriesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-shop-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_categories").select("*").is("deleted_at", null).order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  async function save() {
    if (!editing?.name || !editing?.slug) return toast.error("Name and slug required");
    const { error } = await supabase.rpc("admin_save_shop_category", {
      p_id: (editing.id ?? null) as never,
      p_name: editing.name, p_slug: editing.slug, p_sort_order: editing.sort_order ?? 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-shop-categories"] });
  }

  async function del(id: number) {
    if (!confirm("Delete category?")) return;
    const { error } = await supabase.rpc("admin_delete_shop_category", { p_id: id });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-shop-categories"] });
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={() => setEditing({ name: "", slug: "", sort_order: 0 })} className="flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20">
          <Plus size={14} /> New Category
        </button>
      </div>
      <div className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
        <table className="w-full text-sm">
          <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Slug</th><th className="px-3 py-2">Order</th><th className="px-3 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-3 py-6 text-center text-foreground/50">Loading…</td></tr>}
            {data?.map((c) => (
              <tr key={c.id} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2 font-display"><Tag className="mr-2 inline h-3 w-3 text-gold" />{c.name}</td>
                <td className="px-3 py-2 font-mono text-foreground/70">{c.slug}</td>
                <td className="px-3 py-2">{c.sort_order}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(c)} className="rounded border border-border/60 px-2 py-1 hover:border-gold hover:text-gold"><Pencil size={12} /></button>
                    <button onClick={() => del(c.id)} className="rounded border border-border/60 px-2 py-1 hover:border-destructive hover:text-destructive"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal title={editing.id ? "Edit Category" : "New Category"} onClose={() => setEditing(null)} onSave={save}>
          <Grid>
            <Field label="Name"><input className={inp} value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Slug"><input className={inp} value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
            <Field label="Sort Order"><input type="number" className={inp} value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
          </Grid>
        </Modal>
      )}
    </>
  );
}

function StatusBadge({ s }: { s: string }) {
  const c = s === "Approved" ? "border-emerald-500/50 text-emerald-300"
    : s === "Rejected" ? "border-destructive/50 text-destructive"
    : "border-amber-500/50 text-amber-300";
  return <span className={`rounded border px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest ${c}`}>{s}</span>;
}

const inp = "w-full rounded border border-border/60 bg-secondary/40 px-3 py-2 font-mono text-sm outline-none focus:border-gold";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">{label}</span>{children}</label>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>;
}

function Modal({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur">
      <div className="hud-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-md border border-gold/40 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg uppercase tracking-widest text-gold">{title}</h2>
          <button onClick={onClose} className="font-hud text-xs uppercase tracking-widest text-foreground/60 hover:text-gold">Close</button>
        </div>
        {children}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest hover:border-foreground">Cancel</button>
          <button onClick={onSave} className="rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20">Save</button>
        </div>
      </div>
    </div>
  );
}
