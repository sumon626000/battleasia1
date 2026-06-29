import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/feed/new")({
  component: NewPostPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl p-6 font-hud text-sm text-red-400">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl p-6 font-hud text-sm">Not found.</div>
  ),
});

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024;

type Item = {
  file: File;
  preview: string;
  mediaType: "image" | "video";
};

function NewPostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: Item[] = [];
    for (const f of Array.from(list)) {
      if (items.length + next.length >= MAX_FILES) {
        toast.error(`Max ${MAX_FILES} files`);
        break;
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name} > 50MB skipped`);
        continue;
      }
      const type = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") ? "image" : null;
      if (!type) {
        toast.error(`${f.name} not image/video`);
        continue;
      }
      next.push({ file: f, preview: URL.createObjectURL(f), mediaType: type });
    }
    setItems((prev) => [...prev, ...next]);
  }

  function removeAt(i: number) {
    setItems((prev) => {
      const x = [...prev];
      URL.revokeObjectURL(x[i].preview);
      x.splice(i, 1);
      return x;
    });
  }

  function move(i: number, dir: -1 | 1) {
    setItems((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const x = [...prev];
      [x[i], x[j]] = [x[j], x[i]];
      return x;
    });
  }

  async function submit() {
    if (!user) return;
    if (!caption.trim() && !items.length) {
      toast.error("Add a caption or media");
      return;
    }
    setBusy(true);
    try {
      // Upload all
      const uploaded: { url: string; media_type: string }[] = [];
      for (const it of items) {
        const ext = it.file.name.split(".").pop() || "bin";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("social-media").upload(path, it.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: it.file.type || undefined,
        });
        if (upErr) throw upErr;
        const { data: signed, error: sErr } = await supabase.storage
          .from("social-media")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        if (sErr) throw sErr;
        uploaded.push({ url: signed.signedUrl, media_type: it.mediaType });
      }

      const primary = uploaded[0];
      const { data: postRow, error } = await supabase
        .from("social_posts")
        .insert({
          user_id: user.id,
          caption: caption.trim() || null,
          media_url: primary?.url ?? null,
          media_type: primary?.media_type ?? "image",
          visibility: "public",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Insert media rows (always, even single, so carousel can read)
      if (postRow && uploaded.length) {
        const rows = uploaded.map((u, i) => ({
          post_id: postRow.id,
          url: u.url,
          media_type: u.media_type,
          position: i,
        }));
        const { error: mErr } = await supabase.from("social_post_media").insert(rows);
        if (mErr) throw mErr;
      }

      toast.success("Post published");
      navigate({ to: "/feed" });
    } catch (e: any) {
      toast.error(e.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-3 py-6 sm:px-4">
      <header className="mb-5 flex items-center gap-3">
        <Link to="/feed" className="btn-outline-gold p-2" aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="font-display text-2xl font-black tracking-wide">
          NEW <span className="text-gold">DROP</span>
        </h1>
      </header>

      <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What's the play?"
          maxLength={2200}
          rows={4}
          className="w-full resize-none rounded-lg border border-border/70 bg-background/60 p-3 font-hud text-sm text-foreground placeholder:text-foreground/40 focus:border-gold/60 focus:outline-none"
        />
        <div className="flex justify-between font-hud text-[10px] text-foreground/40">
          <span>{items.length}/{MAX_FILES} media</span>
          <span>{caption.length}/2200</span>
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {items.map((it, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-border/70 bg-black">
                {it.mediaType === "video" ? (
                  <video src={it.preview} className="h-full w-full object-cover" muted />
                ) : (
                  <img src={it.preview} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 font-hud text-[10px] font-bold text-gold">
                  {i + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white"
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
                {items.length > 1 && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/80 to-transparent px-1 py-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="font-hud text-[10px] font-bold text-white/80 disabled:opacity-30"
                    >
                      ←
                    </button>
                    <GripVertical size={12} className="text-white/40" />
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      className="font-hud text-[10px] font-bold text-white/80 disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {items.length < MAX_FILES && (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/70 bg-background/40 p-6 text-center transition hover:border-gold/60 hover:bg-gold/5">
            <ImagePlus className="text-gold" size={26} />
            <span className="font-hud text-sm font-semibold">
              {items.length === 0 ? "Upload images or videos" : "Add more"}
            </span>
            <span className="font-hud text-[10px] text-foreground/50">Up to {MAX_FILES} files · Max 50MB each</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="btn-gold flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? "Publishing..." : "Publish"}
        </button>
      </div>
    </div>
  );
}
