import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, Check } from "lucide-react";

export interface ServerOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  label?: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: readonly ServerOption[];
  error?: string;
}

export function GameServerSelect({ label = "GAME SERVER", value, onChange, options, error }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative block" ref={ref}>
      <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`mt-1 flex w-full items-center justify-between gap-2 rounded-md border bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50 ${
          error ? "border-destructive" : "border-border"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe size={14} className="shrink-0 text-gold" />
          <span className="truncate font-semibold">{current?.label ?? "Select"}</span>
        </span>
        <ChevronDown size={14} className={`shrink-0 text-foreground/60 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border border-gold/40 bg-card/95 shadow-2xl backdrop-blur-xl">
          <ul className="py-1">
            {options.map((o) => {
              const active = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-gold/10 ${
                      active ? "bg-gold/15 text-gold" : "text-foreground/85"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{o.label}</span>
                      {o.hint && (
                        <span className="block font-mono text-[10px] text-foreground/50">{o.hint}</span>
                      )}
                    </span>
                    {active && <Check size={14} className="shrink-0 text-gold" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
