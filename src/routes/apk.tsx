import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, Download, ShieldCheck, Calendar } from "lucide-react";
import { ApkIcon } from "@/components/site/ApkIcon";

export const Route = createFileRoute("/apk")({
  head: () => ({
    meta: [
      { title: "Download APK — Battle Asia" },
      { name: "description", content: "Download the Battle Asia mobile app (APK) for Android." },
      { property: "og:title", content: "Download Battle Asia APK" },
      { property: "og:description", content: "Official Android APK for Battle Asia." },
    ],
  }),
  component: ApkPage,
});

async function fetchApk() {
  const { data, error } = await supabase
    .from("apk_versions")
    .select("id,version_name,version_code,apk_file_url,changelog,file_size_bytes,force_update,created_at")
    .eq("is_active", true)
    .order("version_code", { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

function ApkPage() {
  const { data, isLoading } = useQuery({ queryKey: ["public-apk"], queryFn: fetchApk });
  const latest = data?.[0];
  const older = (data ?? []).slice(1);

  const mb = (b: number | null) =>
    b ? `${(Number(b) / (1024 * 1024)).toFixed(1)} MB` : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="hud-panel rounded-md border border-gold/30 bg-card/40 p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-md border border-gold/40 bg-gold/10 text-gold drop-shadow-[0_0_18px_rgba(212,175,55,0.45)]">
            <ApkIcon size={28} />
          </span>
          <h1 className="font-display text-3xl uppercase tracking-[0.2em] text-gold">Download APK</h1>
        </div>
        <p className="mt-2 font-hud text-xs uppercase tracking-widest text-foreground/60">
          Official Battle Asia Android app
        </p>
      </div>

      {isLoading && <p className="mt-6 text-center text-foreground/50">Loading…</p>}
      {!isLoading && !latest && (
        <p className="mt-6 text-center text-foreground/50">No APK available right now.</p>
      )}

      {latest && (
        <div className="mt-6 hud-panel rounded-md border border-gold/60 bg-card/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-hud text-[10px] uppercase tracking-widest text-emerald-400">
                Latest Build
              </div>
              <h2 className="font-display text-2xl uppercase tracking-wide text-foreground">
                v{latest.version_name}
                <span className="ml-2 font-mono text-sm text-foreground/50">
                  ({latest.version_code})
                </span>
              </h2>
              <div className="mt-1 flex flex-wrap gap-3 font-mono text-[11px] text-foreground/60">
                {mb(latest.file_size_bytes) && <span>{mb(latest.file_size_bytes)}</span>}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(latest.created_at).toLocaleDateString()}
                </span>
                {latest.force_update && (
                  <span className="rounded bg-destructive/20 px-1.5 text-destructive">Required</span>
                )}
              </div>
            </div>
            <a
              href={latest.apk_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <ApkIcon size={18} /> Download APK
            </a>
          </div>
          {latest.changelog && (
            <div className="mt-4 border-t border-border/40 pt-4">
              <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                Changelog
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">
                {latest.changelog}
              </p>
            </div>
          )}
          <div className="mt-4 flex items-start gap-2 rounded border border-border/40 bg-background/60 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p className="font-mono text-[11px] text-foreground/60">
              Enable "Install from unknown sources" on Android. Only download from official Battle Asia sources.
            </p>
          </div>
        </div>
      )}

      {older.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 font-hud text-xs uppercase tracking-widest text-foreground/60">
            Previous Versions
          </h3>
          <div className="space-y-2">
            {older.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded border border-border/40 bg-card/30 px-4 py-3"
              >
                <div>
                  <div className="font-display text-sm uppercase tracking-wide">v{a.version_name}</div>
                  <div className="font-mono text-[10px] text-foreground/50">
                    {new Date(a.created_at).toLocaleDateString()}
                    {mb(a.file_size_bytes) ? ` · ${mb(a.file_size_bytes)}` : ""}
                  </div>
                </div>
                <a
                  href={a.apk_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline-gold px-3 py-1.5 text-xs"
                >
                  <Download className="mr-1 inline h-3 w-3" /> Get
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
