import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Pin, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/feed")({
  component: AdminFeedPage,
});

type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

type Post = {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  is_published: boolean;
  is_pinned: boolean;
  published_at: string | null;
  created_at: string;
  view_count: number | null;
};

function AdminFeedPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"posts" | "categories">("posts");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">
          Feed Operations
        </h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
          Manage news posts and categories
        </p>
      </div>

      <div className="flex gap-2">
        {(["posts", "categories"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded border px-4 py-1.5 font-hud text-xs uppercase tracking-widest ${
              tab === t
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-border/60 text-foreground/70 hover:border-gold/40"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "posts" ? <PostsTab qc={qc} /> : <CategoriesTab qc={qc} />}
    </div>
  );
}

function PostsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [editing, setEditing] = useState<Post | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-feed-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-feed-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.rpc("admin_delete_feed_post", { p_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["admin-feed-posts"] });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20"
        >
          <Plus size={14} /> New Post
        </button>
      </div>

      {isLoading ? (
        <div className="rounded border border-border/60 bg-card/40 p-8 text-center font-hud text-xs uppercase tracking-widest text-foreground/60">
          Loading...
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-border/60 bg-card/40">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-secondary/40 font-hud text-[11px] uppercase tracking-widest text-foreground/60">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Views</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts?.map((p) => (
                <tr key={p.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {p.is_pinned && <Pin size={12} className="text-gold" />}
                      <span className="font-semibold">{p.title}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs text-foreground/60">{p.slug}</td>
                  <td className="p-3">
                    {p.is_published ? (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-emerald-400">
                        <Eye size={10} /> Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                        <EyeOff size={10} /> Draft
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">{p.view_count ?? 0}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(p)}
                        className="rounded border border-border/60 p-1.5 hover:border-gold/60 hover:text-gold"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded border border-red-500/40 p-1.5 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-hud text-xs uppercase tracking-widest text-foreground/60">
                    No posts yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <PostFormModal
          post={editing}
          categories={categories ?? []}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-feed-posts"] });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function PostFormModal({
  post,
  categories,
  onClose,
  onSaved,
}: {
  post: Post | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    cover_url: post?.cover_url ?? "",
    category_id: post?.category_id ?? "",
    is_published: post?.is_published ?? false,
    is_pinned: post?.is_pinned ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc("admin_save_feed_post", {
      p_id: post?.id ?? null,
      p_category_id: form.category_id || null,
      p_title: form.title,
      p_slug: form.slug,
      p_excerpt: form.excerpt || null,
      p_body: form.body || null,
      p_cover_url: form.cover_url || null,
      p_is_published: form.is_published,
      p_is_pinned: form.is_pinned,
      p_published_at: null,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(post ? "Post updated" : "Post created");
      onSaved();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-gold/40 bg-card p-6 shadow-2xl"
      >
        <h3 className="mb-4 font-display text-lg uppercase tracking-[0.2em] text-gold">
          {post ? "Edit Post" : "New Post"}
        </h3>
        <div className="space-y-3">
          <Field label="Title">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            />
          </Field>
          <Field label="Slug">
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-mono text-sm"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cover URL">
            <input
              value={form.cover_url}
              onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            />
          </Field>
          <Field label="Excerpt">
            <textarea
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            />
          </Field>
          <Field label="Body (Markdown)">
            <textarea
              rows={8}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-mono text-sm"
            />
          </Field>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 font-hud text-xs uppercase tracking-widest">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              Published
            </label>
            <label className="flex items-center gap-2 font-hud text-xs uppercase tracking-widest">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
              />
              Pinned
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CategoriesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-feed-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    const { error } = await supabase.rpc("admin_delete_feed_category", { p_id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["admin-feed-categories"] });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20"
        >
          <Plus size={14} /> New Category
        </button>
      </div>

      {isLoading ? (
        <div className="rounded border border-border/60 bg-card/40 p-8 text-center font-hud text-xs uppercase tracking-widest text-foreground/60">
          Loading...
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-border/60 bg-card/40">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-secondary/40 font-hud text-[11px] uppercase tracking-widest text-foreground/60">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Order</th>
                <th className="p-3 text-left">Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((c) => (
                <tr key={c.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3 font-mono text-xs">{c.slug}</td>
                  <td className="p-3">{c.sort_order}</td>
                  <td className="p-3">{c.is_active ? "Yes" : "No"}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditing(c)}
                        className="rounded border border-border/60 p-1.5 hover:border-gold/60 hover:text-gold"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="rounded border border-red-500/40 p-1.5 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-hud text-xs uppercase tracking-widest text-foreground/60">
                    No categories yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <CategoryFormModal
          category={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-feed-categories"] });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    sort_order: category?.sort_order ?? 0,
    is_active: category?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc("admin_save_feed_category", {
      p_id: category?.id ?? null,
      p_name: form.name,
      p_slug: form.slug,
      p_sort_order: form.sort_order,
      p_is_active: form.is_active,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(category ? "Category updated" : "Category created");
      onSaved();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded border border-gold/40 bg-card p-6 shadow-2xl"
      >
        <h3 className="mb-4 font-display text-lg uppercase tracking-[0.2em] text-gold">
          {category ? "Edit Category" : "New Category"}
        </h3>
        <div className="space-y-3">
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            />
          </Field>
          <Field label="Slug">
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-mono text-sm"
            />
          </Field>
          <Field label="Sort Order">
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            />
          </Field>
          <label className="flex items-center gap-2 font-hud text-xs uppercase tracking-widest">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Active
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-hud text-[11px] uppercase tracking-widest text-foreground/60">
        {label}
      </span>
      {children}
    </label>
  );
}
