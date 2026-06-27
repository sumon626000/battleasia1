import { useState } from "react";
import { Globe, Check } from "lucide-react";
import { LANGS, useT, type Lang } from "@/lib/i18n";

function FlagImg({ iso2, size = 18 }: { iso2: string; size?: number }) {
  const code = iso2.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt={iso2}
      width={size}
      height={Math.round((size * 3) / 4)}
      className="inline-block shrink-0 rounded-[2px] object-cover shadow-sm ring-1 ring-black/20"
      style={{ width: size, height: Math.round((size * 3) / 4) }}
      loading="lazy"
    />
  );
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-border/70 bg-background/60 px-2.5 py-1.5 text-xs font-semibold transition hover:border-gold/60 hover:text-gold"
        aria-label="Change language"
      >
        <Globe size={14} className="text-gold" />
        {compact ? <FlagImg iso2={current.iso2} size={16} /> : (
          <span className="flex items-center gap-1.5 font-hud tracking-wide">
            <FlagImg iso2={current.iso2} size={16} />
            {current.code.toUpperCase()}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-border bg-background shadow-xl backdrop-blur-md" style={{ backgroundColor: 'hsl(var(--card))', backgroundImage: 'linear-gradient(hsl(var(--card)), hsl(var(--card)))' }}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code as Lang); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-secondary"
              >
                <span className="flex items-center gap-2">
                  <FlagImg iso2={l.iso2} size={18} />
                  <span className="font-medium">{l.label}</span>
                </span>
                {l.code === lang && <Check size={14} className="text-gold" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
