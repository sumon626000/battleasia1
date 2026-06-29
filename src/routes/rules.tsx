import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Rules — Battle Asia" },
      { name: "description", content: "Official tournament rules and fair-play policy for Battle Asia." },
    ],
  }),
  component: Rules,
});

function Rules() {
  const rules = [
    "No hacks, mods, emulators (when banned), or third-party tools. Instant ban + forfeit of entry.",
    "No teaming in Solo. No stream sniping. No account sharing.",
    "Join the custom room within 5 minutes of room ID release or you forfeit.",
    "Submit kill proof (screenshot of result screen) within 10 minutes after match end.",
    "Disputes must be filed within 30 minutes with video/screenshot evidence.",
    "Admin decisions are final. Repeat offenders are permanently banned and balances frozen.",
  ];
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">RULES</h1>
        <p className="mt-2 text-muted-foreground">Play fair. Win clean. These rules apply to every match on Battle Asia.</p>
        <ol className="mt-8 space-y-3">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-3 rounded-lg border border-border/70 bg-card/60 p-4">
              <span className="font-display text-lg font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-foreground/90">{r}</span>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </div>
  );
}
