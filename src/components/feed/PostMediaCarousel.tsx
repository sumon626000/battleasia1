import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { SignedImage, SignedVideo } from "@/components/feed/SignedMedia";

export type CarouselMedia = { url: string; media_type: string };

type Props = {
  media: CarouselMedia[];
  onDoubleTapLike?: () => void;
  liked?: boolean;
};

export function PostMediaCarousel({ media, onDoubleTapLike, liked }: Props) {
  const [idx, setIdx] = useState(0);
  const [burst, setBurst] = useState(0); // increment to retrigger animation
  const trackRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<number>(0);

  // Sync index from scroll position
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth;
        if (w > 0) setIdx(Math.round(el.scrollLeft / w));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  function handleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      if (onDoubleTapLike) {
        onDoubleTapLike();
        setBurst((b) => b + 1);
      }
    } else {
      lastTapRef.current = now;
    }
  }

  function scrollTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  if (!media.length) return null;

  return (
    <div className="relative bg-black select-none" onClick={handleTap}>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {media.map((m, i) => (
          <div key={i} className="relative w-full shrink-0 snap-center">
            {m.media_type === "video" ? (
              <SignedVideo
                src={m.url}
                controls
                playsInline
                className="max-h-[640px] w-full object-contain"
              />
            ) : (
              <SignedImage
                src={m.url}
                alt={`media ${i + 1}`}
                className="max-h-[640px] w-full object-contain"
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>

      {/* HUD corners */}
      <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-gold/70" />
      <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r-2 border-t-2 border-gold/70" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-gold/70" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-gold/70" />

      {/* Counter pill */}
      {media.length > 1 && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 font-hud text-[10px] font-bold tracking-wider text-white">
          {idx + 1}/{media.length}
        </div>
      )}

      {/* Dots */}
      {media.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {media.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                scrollTo(i);
              }}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-gold" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}

      {/* Double-tap heart burst */}
      {burst > 0 && (
        <span
          key={burst}
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
        >
          <Heart
            size={120}
            fill="#ff3b6b"
            strokeWidth={0}
            className="drop-shadow-[0_4px_24px_rgba(255,59,107,0.6)] animate-[heartPop_700ms_ease-out_forwards]"
          />
        </span>
      )}
      <style>{`
        @keyframes heartPop {
          0% { opacity: 0; transform: scale(0.4); }
          25% { opacity: 1; transform: scale(1.15); }
          60% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
      {/* Hidden state hint for liked (avoids unused-var warning) */}
      {liked === false ? null : null}
    </div>
  );
}
