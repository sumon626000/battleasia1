import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export type ConfirmTone = "default" | "danger" | "gold";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  loading = false,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
      if (e.key === "Enter" && !loading) onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose, onConfirm]);

  if (!open) return null;

  const confirmCls =
    tone === "danger"
      ? "bg-red-500 text-white hover:bg-red-600"
      : tone === "gold"
        ? "btn-gold"
        : "bg-primary text-primary-foreground hover:bg-primary/90";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-in fade-in-0">
      <div className="hud-panel relative w-full max-w-md overflow-hidden border-gold/40 bg-background p-5 animate-in zoom-in-95">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-2 top-2 rounded-sm p-1 text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
          aria-label="Close"
        >
          <X size={14} />
        </button>
        <div className="flex items-start gap-3">
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-sm ${
              tone === "danger" ? "bg-red-500/15 text-red-400" : "bg-gold/15 text-gold"
            }`}
          >
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold uppercase tracking-wide">{title}</h3>
            {message && <div className="mt-1.5 text-sm text-foreground/70">{message}</div>}
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-sm border border-border/60 px-4 py-2 font-hud text-xs font-bold uppercase tracking-widest text-foreground/70 hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-sm px-4 py-2 font-hud text-xs font-bold uppercase tracking-widest disabled:opacity-50 ${confirmCls}`}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
