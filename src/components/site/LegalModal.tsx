import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  type: "terms" | "privacy";
  open: boolean;
  onClose: () => void;
}

export function LegalModal({ type, open, onClose }: Props) {
  if (!open) return null;
  const title = type === "terms" ? "Terms of Service" : "Privacy Policy";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="hud-panel relative max-h-[80vh] w-full max-w-2xl overflow-hidden border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hud-bracket hud-bracket-tl" />
        <span className="hud-bracket hud-bracket-tr" />
        <span className="hud-bracket hud-bracket-bl" />
        <span className="hud-bracket hud-bracket-br" />

        <div className="flex items-center justify-between border-b border-border bg-background/60 px-5 py-3">
          <h2 className="font-display text-xl tracking-wide text-gold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-foreground/70 hover:text-gold">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-sm leading-relaxed text-foreground/80">
          {type === "terms" ? <TermsBody /> : <PrivacyBody />}
        </div>

        <div className="border-t border-border bg-background/60 px-5 py-3 text-right">
          <button onClick={onClose} className="btn-gold px-4 py-2 text-xs">
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

function TermsBody() {
  return (
    <div className="space-y-3">
      <p>By creating an account on Battle Asia you agree to the rules below.</p>
      <h3 className="font-display text-base text-gold">1. Account</h3>
      <p>You must provide accurate registration details, including a valid PUBG ID. One account per player.</p>
      <h3 className="font-display text-base text-gold">2. Tournament Conduct</h3>
      <p>Cheating, hacking, account sharing, or use of third-party tools results in permanent ban and forfeiture of any BAC balance.</p>
      <h3 className="font-display text-base text-gold">3. Entry Fees and Rewards</h3>
      <p>BAC coins used for entry are non-refundable once a match has started. Prize distribution follows the published match rules.</p>
      <h3 className="font-display text-base text-gold">4. Withdrawals</h3>
      <p>Withdrawals are processed manually and may take up to 72 hours. Minimum withdrawal limits apply per payment channel.</p>
      <h3 className="font-display text-base text-gold">5. Liability</h3>
      <p>Battle Asia is not responsible for in-game issues caused by the game publisher, network outages, or device failure.</p>
    </div>
  );
}

function PrivacyBody() {
  return (
    <div className="space-y-3">
      <p>We respect your privacy. This summary explains what we collect and how it is used.</p>
      <h3 className="font-display text-base text-gold">Data we collect</h3>
      <p>Email, in-game username, PUBG ID, country code, mobile number, game server, and login/device metadata for security.</p>
      <h3 className="font-display text-base text-gold">How we use it</h3>
      <p>Account management, match participation, payouts, customer support, fraud prevention, and required legal compliance.</p>
      <h3 className="font-display text-base text-gold">Sharing</h3>
      <p>We do not sell your data. Limited operational data is shared with payment processors to complete deposits and withdrawals.</p>
      <h3 className="font-display text-base text-gold">Your rights</h3>
      <p>You can request data export or account deletion at any time from the Profile page or by contacting support.</p>
    </div>
  );
}
