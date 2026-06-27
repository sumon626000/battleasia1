import { createFileRoute } from "@tanstack/react-router";
import { Mail, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/email-setup")({
  component: AdminEmailSetupPage,
});

function AdminEmailSetupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] flex items-center gap-2">
          <Mail className="h-6 w-6 text-gold" /> Email Setup
        </h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
          Configure transactional &amp; auth email domain
        </p>
      </div>

      <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-5 space-y-3">
        <h2 className="font-display text-base uppercase tracking-widest flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400" /> Status
        </h2>
        <p className="font-hud text-sm text-foreground/70">
          The platform currently sends auth emails (signup confirmation, password
          reset) via the default Lovable Cloud sender. To use your own branded
          sender domain (e.g. <code className="text-gold">noreply@battleasia.com</code>),
          you must configure DNS records and verify the domain.
        </p>
      </section>

      <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-5 space-y-4">
        <h2 className="font-display text-base uppercase tracking-widest">Setup Steps</h2>
        <ol className="space-y-3 font-hud text-sm text-foreground/80">
          <li className="flex gap-3">
            <span className="font-display text-gold">1.</span>
            <div>
              <div className="font-display uppercase tracking-widest text-foreground">Add your sender domain</div>
              <p className="text-xs text-foreground/60">Configure DNS (SPF, DKIM, DMARC) at your registrar.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-display text-gold">2.</span>
            <div>
              <div className="font-display uppercase tracking-widest text-foreground">Verify domain</div>
              <p className="text-xs text-foreground/60">DNS propagation can take a few minutes to several hours.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-display text-gold">3.</span>
            <div>
              <div className="font-display uppercase tracking-widest text-foreground">Activate custom templates</div>
              <p className="text-xs text-foreground/60">Auth emails will switch to the branded templates automatically.</p>
            </div>
          </li>
        </ol>

        <div className="pt-2 border-t border-border/40">
          <p className="font-hud text-xs uppercase tracking-widest text-foreground/60 mb-3">Launch setup</p>
          <div
            className="inline-flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-5 py-2 font-hud text-xs uppercase tracking-widest text-gold cursor-pointer hover:bg-gold/20"
            onClick={() => {
              // Surfaced via Lovable agent — user clicks the in-chat action.
              alert("Ask Lovable: 'set up my email domain' to launch the setup dialog.");
            }}
          >
            <Mail className="h-4 w-4" /> Open Email Setup
          </div>
          <p className="mt-3 font-mono text-[10px] text-foreground/50">
            Tip: type <span className="text-gold">"set up my email domain"</span> in chat to launch the guided dialog.
          </p>
        </div>
      </section>

      <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-5 space-y-3">
        <h2 className="font-display text-base uppercase tracking-widest flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> What ships when ready
        </h2>
        <ul className="space-y-2 font-hud text-sm text-foreground/70">
          <li>• Branded signup confirmation</li>
          <li>• Branded password reset</li>
          <li>• Magic link &amp; email change</li>
          <li>• Account invite &amp; reauthentication</li>
        </ul>
        <a
          href="https://docs.lovable.dev/features/cloud#emails"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 font-hud text-xs uppercase tracking-widest text-gold hover:underline"
        >
          Documentation <ExternalLink className="h-3 w-3" />
        </a>
      </section>
    </div>
  );
}
