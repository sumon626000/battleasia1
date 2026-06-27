import { X } from "lucide-react";
import { DashNavBody } from "./DashboardSidebar";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DashboardMobileDrawer({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        aria-label="Close menu"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-0 h-full w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-display text-lg font-bold">
            BATTLE<span className="text-gold">ASIA</span>
          </span>
          <button onClick={onClose} className="rounded-md p-1.5 text-gold" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <DashNavBody onNavigate={onClose} />
      </div>
    </div>
  );
}
