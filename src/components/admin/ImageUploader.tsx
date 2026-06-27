import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Max width/height after auto-resize. Default 1280. */
  maxSize?: number;
  /** WebP quality 0-1. Default 0.85. */
  quality?: number;
  /** Path prefix in bucket. Default "uploads". */
  folder?: string;
  /** Aspect of preview box. Default "16/9". Use "1/1" for icons. */
  aspect?: string;
  className?: string;
}

async function resizeImage(file: File, maxSize: number, quality: number): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/webp", quality),
  );
}

export function ImageUploader({
  value,
  onChange,
  maxSize = 1280,
  quality = 0.85,
  folder = "uploads",
  aspect = "16/9",
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    setBusy(true);
    try {
      const blob = await resizeImage(file, maxSize, quality);
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      const { error } = await supabase.storage
        .from("admin-assets")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage
        .from("admin-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (sErr || !data?.signedUrl) throw sErr ?? new Error("Could not create URL");
      onChange(data.signedUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        className="relative w-full overflow-hidden rounded border border-border/60 bg-background/40"
        style={{ aspectRatio: aspect }}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white hover:bg-red-600"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-foreground/50 hover:text-gold"
          >
            {busy ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            <span className="font-hud text-[11px] uppercase tracking-widest">
              {busy ? "Uploading…" : "Upload image"}
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded border border-border/60 px-2.5 py-1 font-hud text-[11px] uppercase tracking-widest text-foreground/80 hover:border-gold hover:text-gold disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {value ? "Replace" : "Upload"}
        </button>
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="Or paste image URL"
          className="flex-1 rounded border border-border/60 bg-background/60 px-2.5 py-1 font-mono text-[11px]"
        />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
