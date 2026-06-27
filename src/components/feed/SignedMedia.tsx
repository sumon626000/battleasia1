import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();
// Pending sign requests batched per tick to reduce round-trips.
let pending: { path: string; raw: string; resolve: (url: string) => void }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function extractPath(url: string): string | null {
  const m = url.match(/\/social-media\/(.+?)(?:\?|$)/);
  return m ? m[1] : null;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    const batch = pending;
    pending = [];
    flushTimer = null;
    if (!batch.length) return;
    // Dedupe by path
    const unique = Array.from(new Set(batch.map((b) => b.path)));
    try {
      const { data } = await supabase.storage
        .from("social-media")
        .createSignedUrls(unique, 60 * 60 * 24 * 30);
      const map: Record<string, string> = {};
      (data ?? []).forEach((d: any) => { if (d?.path && d?.signedUrl) map[d.path] = d.signedUrl; });
      batch.forEach((b) => {
        const signed = map[b.path];
        if (signed) {
          cache.set(b.raw, signed);
          b.resolve(signed);
        } else {
          b.resolve(b.raw);
        }
      });
    } catch {
      batch.forEach((b) => b.resolve(b.raw));
    }
  }, 16);
}

function requestSign(raw: string, path: string): Promise<string> {
  return new Promise((resolve) => {
    pending.push({ raw, path, resolve });
    scheduleFlush();
  });
}

export function useSignedMediaUrl(rawUrl: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!rawUrl) return null;
    if (cache.has(rawUrl)) return cache.get(rawUrl)!;
    if (rawUrl.includes("/object/sign/") || rawUrl.includes("token=")) return rawUrl;
    return null;
  });

  useEffect(() => {
    if (!rawUrl) { setUrl(null); return; }
    if (cache.has(rawUrl)) { setUrl(cache.get(rawUrl)!); return; }
    if (rawUrl.includes("/object/sign/") || rawUrl.includes("token=")) {
      cache.set(rawUrl, rawUrl);
      setUrl(rawUrl);
      return;
    }
    const path = extractPath(rawUrl);
    if (!path) { setUrl(rawUrl); return; }
    let cancelled = false;
    requestSign(rawUrl, path).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [rawUrl]);

  return url;
}

export function SignedImage({ src, ...rest }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string | null }) {
  const url = useSignedMediaUrl(src);
  if (!url) return <div className="aspect-square w-full animate-pulse bg-card/40" />;
  return <img src={url} decoding="async" {...rest} />;
}

export function SignedVideo({ src, ...rest }: React.VideoHTMLAttributes<HTMLVideoElement> & { src: string | null }) {
  const url = useSignedMediaUrl(src);
  if (!url) return <div className="aspect-square w-full animate-pulse bg-card/40" />;
  return <video src={url} preload="metadata" playsInline {...rest} />;
}
