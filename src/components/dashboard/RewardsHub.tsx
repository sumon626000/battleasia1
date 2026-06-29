import { useState } from "react";
import { Gift, Target, Sparkles } from "lucide-react";
import { DailyLoginCard } from "./DailyLoginCard";
import { DailyQuestsCard } from "./DailyQuestsCard";
import { SpinWheelCard } from "./SpinWheelCard";

type Tab = "login" | "quests" | "spin";

const TABS: { id: Tab; label: string; icon: typeof Gift }[] = [
  { id: "login", label: "Daily Login", icon: Gift },
  { id: "quests", label: "Quests", icon: Target },
  { id: "spin", label: "Spin", icon: Sparkles },
];

export function RewardsHub() {
  const [active, setActive] = useState<Tab>("login");

  return (
    <section className="hud-panel overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 pt-3">
        <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
          Rewards Hub
        </h2>
      </div>
      <div role="tablist" className="flex gap-1 px-2 pt-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-md border-b-2 px-2 py-2 font-hud text-[11px] font-bold uppercase tracking-wider transition ${
                isActive
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-transparent text-foreground/55 hover:text-foreground"
              }`}
            >
              <Icon size={13} />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div className="p-3 sm:p-4 [&>*]:!border-0 [&>*]:!bg-transparent [&>*]:!p-0 [&>*]:!shadow-none">
        {active === "login" && <DailyLoginCard />}
        {active === "quests" && <DailyQuestsCard />}
        {active === "spin" && <SpinWheelCard />}
      </div>
    </section>
  );
}
