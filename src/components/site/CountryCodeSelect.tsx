import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { COUNTRIES, findByDial, flagEmoji } from "@/lib/countries";

interface Props {
  label?: string;
  value: string; // dial code e.g. "+880"
  onChange: (dial: string) => void;
  error?: string;
}

export function CountryCodeSelect({ label = "COUNTRY", value, onChange, error }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = findByDial(value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso2.toLowerCase().includes(q) ||
        c.dial.includes(q),
    );
  }, [query]);

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
          {selected ? (
            <>
              <span className="text-lg leading-none">{flagEmoji(selected.iso2)}</span>
              <span className="truncate font-mono text-xs font-bold text-gold">
                {selected.dial}
              </span>
              <span className="hidden truncate text-xs text-foreground/70 sm:inline">
                {selected.iso2}
              </span>
            </>
          ) : (
            <span className="text-foreground/50">Select</span>
          )}
        </span>
        <ChevronDown size={14} className={`shrink-0 text-foreground/60 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-hidden rounded-md border border-gold/40 bg-card/95 shadow-2xl backdrop-blur-xl">
          <div className="border-b border-border/60 p-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/50" />
              <input
                autoFocus
                placeholder="Search country or code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-background/80 py-2 pl-8 pr-2 text-sm outline-none focus:border-gold"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-foreground/50">No results</li>
            )}
            {filtered.map((c) => {
              const active = c.dial === value;
              return (
                <li key={c.iso2}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.dial);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-gold/10 ${
                      active ? "bg-gold/15 text-gold" : "text-foreground/85"
                    }`}
                  >
                    <span className="text-xl leading-none">{flagEmoji(c.iso2)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.name}</span>
                      <span className="block font-mono text-[11px] text-foreground/55">
                        {c.iso2} ({c.dial})
                      </span>
                    </span>
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
