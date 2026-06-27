import { useState } from "react";
import { Globe, Check } from "lucide-react";
import { LANGS, useT, type Lang } from "@/lib/i18n";

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
        {compact ? <span>{current.flag}</span> : (
          <span className="font-hud tracking-wide">{current.flag} {current.code.toUpperCase()}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-border bg-card shadow-xl">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code as Lang); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-secondary"
              >
                <span className="flex items-center gap-2">
                  <span>{l.flag}</span>
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
