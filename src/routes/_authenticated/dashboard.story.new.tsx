import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/story/new")({
  component: NewStoryPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-xl p-6 font-hud text-sm text-red-400">{error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl p-6 font-hud text-sm">Not found.</div>
  ),
});

function NewStoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(f: File | null) {
    if (!f) { setFile(null); setPreview(null); setMediaType(null); return; }
    if (f.size > 50 * 1024 * 1024) { toast.error("Max 50MB"); return; }
    const t = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") ? "image" : null;
    if (!t) { toast.error("Image or video only"); return; }
    setFile(f); setMediaType(t); setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!user || !file) { toast.error("Pick media first"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/stories/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("social-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("social-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (sErr) throw sErr;
      const { error } = await supabase.from("social_stories").insert({
        user_id: user.id,
        media_url: signed.signedUrl,
        media_type: mediaType ?? "image",
        caption: caption.trim() || null,
      });
      if (error) throw error;
      toast.success("Story posted — live for 24h");
      navigate({ to: "/feed" });
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl px-3 py-6 sm:px-4">
      <header className="mb-5 flex items-center gap-3">
        <Link to="/feed" className="btn-outline-gold p-2" aria-label="Back"><ArrowLeft size={16} /></Link>
        <h1 className="font-display text-2xl font-black tracking-wide">NEW <span className="text-gold">STORY</span></h1>
      </header>
      <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-4">
        {preview ? (
          <div className="relative overflow-hidden rounded-lg border border-border/70 bg-black">
            {mediaType === "video" ? <video src={preview} controls className="max-h-[480px] w-full" /> : <img src={preview} alt="" className="max-h-[480px] w-full object-contain" />}
            <button onClick={() => pick(null)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white" aria-label="Remove"><X size={16} /></button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border/70 bg-background/40 p-8 text-center hover:border-gold/60">
            <ImagePlus className="text-gold" size={28} />
            <span className="font-hud text-sm font-semibold">Upload image or video</span>
            <span className="font-hud text-[10px] text-foreground/50">Lives 24 hours · Up to 50MB</span>
            <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
        )}
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={140}
          placeholder="Caption (optional)"
          className="w-full rounded-lg border border-border/70 bg-background/60 p-3 font-hud text-sm focus:border-gold/60 focus:outline-none"
        />
        <button onClick={submit} disabled={busy || !file} className="btn-gold flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? "Posting..." : "Post Story"}
        </button>
      </div>
    </div>
  );
}
