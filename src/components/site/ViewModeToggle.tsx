import { useEffect, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

const KEY = "ba-view-mode";
type Mode = "mobile" | "desktop";

function apply(mode: Mode) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.appendChild(meta);
  }
  meta.content =
    mode === "desktop"
      ? "width=1440, viewport-fit=cover"
      : "width=device-width, initial-scale=1, viewport-fit=cover";
}

export function applySavedViewMode() {
  if (typeof window === "undefined") return;
  const saved = (localStorage.getItem(KEY) as Mode | null) ?? "mobile";
  apply(saved);
}

export function ViewModeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("mobile");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Mode | null) ?? "mobile";
    setMode(saved);
    apply(saved);
  }, []);

  function toggle() {
    const next: Mode = mode === "mobile" ? "desktop" : "mobile";
    setMode(next);
    localStorage.setItem(KEY, next);
    apply(next);
  }

  const isDesktop = mode === "desktop";
  return (
    <button
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-md border border-border/70 text-foreground/75 transition hover:border-gold/60 hover:text-gold"
      aria-label={isDesktop ? "Switch to mobile view" : "Switch to desktop view"}
      title={isDesktop ? "Mobile view" : "Desktop view"}
    >
      {isDesktop ? <Smartphone size={15} /> : <Monitor size={15} />}
      {!compact && <span className="sr-only">Toggle view</span>}
    </button>
  );
}
