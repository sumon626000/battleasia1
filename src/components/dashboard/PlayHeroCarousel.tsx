import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SLIDES: { url: string; title: string; sub: string }[] = [
  { url: "/banners/erangel-sunset.jpg", title: "ERANGEL", sub: "Classic battleground · 100 players drop" },
  { url: "/banners/miramar-convoy.jpg", title: "MIRAMAR", sub: "Desert warfare · vehicle convoys" },
  { url: "/banners/sanhok-jungle.jpg", title: "SANHOK", sub: "Fast 4×4 jungle action" },
  { url: "/banners/vikendi-snow.jpg",  title: "VIKENDI", sub: "Snow ops · tactical sniping" },
  { url: "/banners/night-ops.jpg",     title: "NIGHT OPS", sub: "Low-light raids · squad coordination" },
  { url: "/banners/airdrop-jump.jpg",  title: "AIRDROP", sub: "Loot the crate · own the lobby" },
];

// Preload all once so transitions are instant.
let preloaded = false;
function preloadAll() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  SLIDES.forEach((s) => { const i = new Image(); i.src = s.url; });
}

export function PlayHeroCarousel() {
  const [i, setI] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const live = useQuery({
    queryKey: ["website-setting", "play_hero_live_url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_settings")
        .select("value")
        .eq("key", "play_hero_live_url")
        .maybeSingle();
      return (data?.value as string | null) ?? null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    preloadAll();
    timer.current = setInterval(() => setI((p) => (p + 1) % SLIDES.length), 4500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const liveUrl = (live.data ?? "").trim();

  return (
    <section className="hud-panel relative overflow-hidden">
      <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full">
        {SLIDES.map((s, idx) => (
          <img
            key={s.url}
            src={s.url}
            alt={s.title}
            loading={idx === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={idx === 0 ? "high" : "low"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${
              idx === i ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
          />
        ))}

        {/* gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/30" />
        <div className="absolute inset-0 bg-grid-hud opacity-20" />

        {/* LIVE pill top-right */}
        {liveUrl && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-sm bg-red-600 px-2 py-0.5 font-hud text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-red-600/40 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
          </span>
        )}

        {/* Content */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <p className="font-hud text-[10px] uppercase tracking-[0.3em] text-gold">// PLAY MATCH</p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-foreground sm:text-4xl">
            {SLIDES[i].title}
          </h2>
          <p className="mt-1 max-w-md text-xs text-foreground/70 sm:text-sm">{SLIDES[i].sub}</p>

          <div className="mt-3 flex items-center gap-2">
            {liveUrl ? (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-sm border border-red-400 bg-red-600 px-4 py-2 font-hud text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-red-600/60 transition hover:bg-red-500 animate-pulse"
              >
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                <PlayCircle size={16} /> Watch Live
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-sm border border-red-500/60 bg-red-600/30 px-4 py-2 font-hud text-xs font-bold uppercase tracking-widest text-red-200">
                <PlayCircle size={16} /> Live Soon
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-sm border border-gold/40 bg-gold/10 px-3 py-2 font-hud text-[10px] font-bold uppercase tracking-widest text-gold">
              {String(i + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-2 right-3 flex items-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-6 bg-gold" : "w-1.5 bg-foreground/30 hover:bg-foreground/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
