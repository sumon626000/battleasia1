import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/feed/new")({
  component: NewPostPage,
  errorComponent: ({ error }) => (
    <SiteShell>
      <div className="mx-auto max-w-xl p-6 font-hud text-sm text-red-400">{error.message}</div>
    </SiteShell>
  ),
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-xl p-6 font-hud text-sm">Not found.</div>
    </SiteShell>
  ),
});

function NewPostPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [busy, setBusy] = useState(false);

  function pick(f: File | null) {
    if (!f) {
      setFile(null);
      setPreview(null);
      setMediaType(null);
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error("Max file size 50MB");
      return;
    }
    const type = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") ? "image" : null;
    if (!type) {
      toast.error("Only image or video files");
      return;
    }
    setFile(f);
    setMediaType(type);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!user) return;
    if (!caption.trim() && !file) {
      toast.error("Add a caption or media");
      return;
    }
    setBusy(true);
    try {
      let media_url: string | null = null;
      let media_type: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("social-media").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("social-media").getPublicUrl(path);
        media_url = pub.publicUrl;
        media_type = mediaType;
      }
      const { error } = await supabase.from("social_posts").insert({
        user_id: user.id,
        caption: caption.trim() || null,
        media_url,
        media_type: media_type ?? undefined,
        visibility: "public",
      });
      if (error) throw error;
      toast.success("Post published");
      navigate({ to: "/feed" });
    } catch (e: any) {
      toast.error(e.message || "Failed to post");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteShell>
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
          <div className="flex justify-end font-hud text-[10px] text-foreground/40">{caption.length}/2200</div>

          {preview ? (
            <div className="relative overflow-hidden rounded-lg border border-border/70 bg-black">
              {mediaType === "video" ? (
                <video src={preview} controls className="max-h-[420px] w-full" />
              ) : (
                <img src={preview} alt="preview" className="max-h-[420px] w-full object-contain" />
              )}
              <button
                onClick={() => pick(null)}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white"
                aria-label="Remove"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/70 bg-background/40 p-8 text-center transition hover:border-gold/60 hover:bg-gold/5">
              <ImagePlus className="text-gold" size={28} />
              <span className="font-hud text-sm font-semibold">Upload image or video</span>
              <span className="font-hud text-[10px] text-foreground/50">Up to 50MB</span>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
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
    </SiteShell>
  );
}
