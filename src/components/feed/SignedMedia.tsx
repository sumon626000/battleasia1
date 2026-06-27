import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

function extractPath(url: string): string | null {
  const m = url.match(/\/social-media\/(.+?)(?:\?|$)/);
  return m ? m[1] : null;
}

export function useSignedMediaUrl(rawUrl: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!rawUrl) return null;
    if (cache.has(rawUrl)) return cache.get(rawUrl)!;
    // Already a signed URL? Use it directly.
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
    supabase.storage.from("social-media").createSignedUrl(path, 60 * 60 * 24 * 30).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      cache.set(rawUrl, data.signedUrl);
      setUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [rawUrl]);

  return url;
}

export function SignedImage({ src, ...rest }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string | null }) {
  const url = useSignedMediaUrl(src);
  if (!url) return <div className="h-64 w-full animate-pulse bg-card/40" />;
  return <img src={url} {...rest} />;
}

export function SignedVideo({ src, ...rest }: React.VideoHTMLAttributes<HTMLVideoElement> & { src: string | null }) {
  const url = useSignedMediaUrl(src);
  if (!url) return <div className="h-64 w-full animate-pulse bg-card/40" />;
  return <video src={url} {...rest} />;
}
