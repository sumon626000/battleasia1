const DEFAULT_ITEMS = [
  "⚡ SQUAD CLASH LIVE NOW · 80/100",
  "🏆 WEEKLY PRIZE POOL ৳2,45,300",
  "🔥 NEW MAP: ERANGEL UNLOCKED",
  "💰 BUY 1000 BAC · GET 10% BONUS",
  "🎯 TOP PLAYER: SHADOW_47 · 142 WINS",
];

export function SiteTicker({ items = DEFAULT_ITEMS }: { items?: string[] }) {
  return (
    <div className="border-b border-border/60 bg-card/40">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-2 sm:px-6">
        <span className="badge-live shrink-0">LIVE</span>
        <div className="relative flex-1 overflow-hidden mask-fade">
          <div className="ticker font-mono-tab text-xs text-foreground/85">
            {[...items, ...items].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                <span className="text-gold">▸</span> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
