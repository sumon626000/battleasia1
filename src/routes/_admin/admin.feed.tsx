import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, Crown } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/feed")({
  component: AdminFeedPage,
});

type Category = {
  id: number;
  name: string;
  slug: string;
  deleted_at: string | null;
};

type Post = {
  id: number;
  category_id: number | null;
  title: string;
  description_html: string;
  cover_image_url: string | null;
  status: string;
  premium_only: boolean;
  views_count: number;
  likes_count: number;
  comments_count: number;
  published_at: string | null;
  created_at: string;
  deleted_at: string | null;
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
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Post[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-feed-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_categories")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Category[];
    },
  });

  async function handleDelete(id: number) {
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
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Premium</th>
                <th className="p-3 text-left">Views</th>
                <th className="p-3 text-left">Likes</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts?.map((p) => (
                <tr key={p.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 font-semibold">{p.title}</td>
                  <td className="p-3">
                    {p.status === "Published" ? (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-emerald-400">
                        <Eye size={10} /> Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                        <EyeOff size={10} /> Draft
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {p.premium_only ? <Crown size={14} className="text-gold" /> : "—"}
                  </td>
                  <td className="p-3 font-mono text-xs">{p.views_count}</td>
                  <td className="p-3 font-mono text-xs">{p.likes_count}</td>
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
                  <td colSpan={6} className="p-8 text-center font-hud text-xs uppercase tracking-widest text-foreground/60">
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
    description_html: post?.description_html ?? "",
    cover_image_url: post?.cover_image_url ?? "",
    category_id: post?.category_id ? String(post.category_id) : "",
    status: post?.status ?? "Draft",
    premium_only: post?.premium_only ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc("admin_save_feed_post", {
      p_id: post?.id ?? null,
      p_category_id: form.category_id ? Number(form.category_id) : null,
      p_title: form.title,
      p_description_html: form.description_html,
      p_cover_image_url: form.cover_image_url || null,
      p_status: form.status,
      p_premium_only: form.premium_only,
    } as never);
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
          <Field label="Category">
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cover Image URL">
            <input
              value={form.cover_image_url}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
            />
          </Field>
          <Field label="Description (HTML)">
            <textarea
              required
              rows={10}
              value={form.description_html}
              onChange={(e) => setForm({ ...form, description_html: e.target.value })}
              className="w-full rounded border border-border/60 bg-background/60 px-3 py-2 font-mono text-sm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded border border-border/60 bg-background/60 px-3 py-2"
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            </Field>
            <label className="mt-6 flex items-center gap-2 font-hud text-xs uppercase tracking-widest">
              <input
                type="checkbox"
                checked={form.premium_only}
                onChange={(e) => setForm({ ...form, premium_only: e.target.checked })}
              />
              Premium Only
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
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Category[];
    },
  });

  async function handleDelete(id: number) {
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
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((c) => (
                <tr key={c.id} className="border-b border-border/40 last:border-0">
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3 font-mono text-xs">{c.slug}</td>
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
                  <td colSpan={3} className="p-8 text-center font-hud text-xs uppercase tracking-widest text-foreground/60">
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
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc("admin_save_feed_category", {
      p_id: category?.id ?? null,
      p_name: form.name,
      p_slug: form.slug,
    } as never);
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
