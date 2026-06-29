import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How To Play — Battle Asia" },
      { name: "description", content: "Learn how to register, join matches and win on Battle Asia." },
    ],
  }),
  component: HowToPlay,
});

function HowToPlay() {
  const steps = [
    { n: "01", t: "Register an account", d: "Sign up with your email and verify to unlock the vault." },
    { n: "02", t: "Top up your wallet", d: "Add funds via bKash, Nagad, or supported gateways." },
    { n: "03", t: "Browse matches", d: "Pick a Solo, Duo or Squad match that fits your skill & entry." },
    { n: "04", t: "Join & get room ID", d: "Room ID and password are released minutes before match time." },
    { n: "05", t: "Play & submit proof", d: "Play the match, then submit your kills with screenshot proof." },
    { n: "06", t: "Get paid instantly", d: "Verified winnings drop into your wallet — withdraw anytime." },
  ];
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">HOW TO PLAY</h1>
        <p className="mt-2 text-muted-foreground">Six simple steps to drop into your first paid match.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {steps.map((s) => (
            <div key={s.n} className="rounded-lg border border-border/70 bg-card/60 p-5">
              <div className="text-sm font-bold text-primary">{s.n}</div>
              <h3 className="mt-1 font-display text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
