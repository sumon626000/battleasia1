import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, MessageCircle, FileText, Mail } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Battle Asia" },
      { name: "description", content: "Get help with Battle Asia tournaments, payments, and account issues." },
      { property: "og:title", content: "Support — Battle Asia" },
      { property: "og:description", content: "Reach the Battle Asia support team." },
    ],
  }),
  component: PublicSupport,
});

function PublicSupport() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="hud-panel rounded-md border border-gold/30 bg-card/40 p-6">
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-6 w-6 text-gold" />
          <h1 className="font-display text-3xl uppercase tracking-[0.2em] text-gold">Support</h1>
        </div>
        <p className="mt-2 font-hud text-xs uppercase tracking-widest text-foreground/60">
          We're here to help operatives 24/7.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          to="/dashboard/support"
          className="hud-panel group rounded-md border border-border/60 bg-card/40 p-5 transition hover:border-gold/60"
        >
          <MessageCircle className="h-6 w-6 text-gold" />
          <h3 className="mt-3 font-display text-lg uppercase tracking-wide">Open a Ticket</h3>
          <p className="mt-1 text-sm text-foreground/70">
            Sign in to create a support ticket and chat with our agents.
          </p>
        </Link>
        <Link
          to="/p/$slug"
          params={{ slug: "faq" }}
          className="hud-panel group rounded-md border border-border/60 bg-card/40 p-5 transition hover:border-gold/60"
        >
          <FileText className="h-6 w-6 text-gold" />
          <h3 className="mt-3 font-display text-lg uppercase tracking-wide">FAQ</h3>
          <p className="mt-1 text-sm text-foreground/70">
            Browse common questions about matches, payments, and account.
          </p>
        </Link>
        <Link
          to="/p/$slug"
          params={{ slug: "terms" }}
          className="hud-panel group rounded-md border border-border/60 bg-card/40 p-5 transition hover:border-gold/60"
        >
          <FileText className="h-6 w-6 text-gold" />
          <h3 className="mt-3 font-display text-lg uppercase tracking-wide">Terms & Policies</h3>
          <p className="mt-1 text-sm text-foreground/70">
            Terms of Service, Privacy Policy, Refund Policy.
          </p>
        </Link>
        <a
          href="mailto:support@battleasia.app"
          className="hud-panel group rounded-md border border-border/60 bg-card/40 p-5 transition hover:border-gold/60"
        >
          <Mail className="h-6 w-6 text-gold" />
          <h3 className="mt-3 font-display text-lg uppercase tracking-wide">Email</h3>
          <p className="mt-1 text-sm text-foreground/70">support@battleasia.app</p>
        </a>
      </div>
    </div>
  );
}
