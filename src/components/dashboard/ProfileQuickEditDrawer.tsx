import { useEffect, useState } from "react";
import { UserCog, Save, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Props = {
  profile: {
    id?: string;
    username?: string | null;
    in_game_username?: string | null;
    pubg_id?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
  } | null;
  onSaved?: () => void;
  trigger?: React.ReactNode;
};

export function ProfileQuickEditDrawer({ profile, onSaved, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [igName, setIgName] = useState("");
  const [pubgId, setPubgId] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");

  useEffect(() => {
    if (open && profile) {
      setIgName(profile.in_game_username ?? "");
      setPubgId(profile.pubg_id ?? "");
      setBio(profile.bio ?? "");
      setAvatar(profile.avatar_url ?? "");
    }
  }, [open, profile]);

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        in_game_username: igName.trim() || null,
        pubg_id: pubgId.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatar.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    setOpen(false);
    onSaved?.();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded border border-border/60 px-2.5 py-1 font-hud text-[10px] uppercase tracking-widest transition-all hover:border-gold hover:text-gold hover:shadow-[0_0_8px_rgba(212,175,55,0.25)]"
          >
            <UserCog size={11} />
            Quick Edit
          </button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full border-l border-gold/30 bg-background/95 backdrop-blur-md sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/40 pb-3">
          <SheetTitle className="font-hud uppercase tracking-widest text-foreground">
            <span className="text-gold">/</span> Quick Edit Profile
          </SheetTitle>
          <SheetDescription className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">
            Update your operator details
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-5">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img
                src={avatar}
                alt=""
                className="h-16 w-16 rounded border border-gold/40 object-cover shadow-[0_0_12px_rgba(212,175,55,0.25)]"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded border border-border/50 bg-foreground/5 font-mono text-xs text-foreground/60">
                {(igName || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <label className="mb-1 block font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                Avatar URL
              </label>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://…"
                className="w-full rounded border border-border/50 bg-background/60 px-2 py-1.5 text-sm outline-none focus:border-gold/60"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              In-Game Username
            </label>
            <input
              value={igName}
              onChange={(e) => setIgName(e.target.value)}
              className="w-full rounded border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-gold/60 focus:shadow-[0_0_8px_rgba(212,175,55,0.2)]"
            />
          </div>

          <div>
            <label className="mb-1 block font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              PUBG ID
            </label>
            <input
              value={pubgId}
              onChange={(e) => setPubgId(e.target.value)}
              className="w-full rounded border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-gold/60 focus:shadow-[0_0_8px_rgba(212,175,55,0.2)]"
            />
          </div>

          <div>
            <label className="mb-1 block font-hud text-[10px] uppercase tracking-widest text-foreground/60">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={160}
              className="w-full resize-none rounded border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none transition-colors focus:border-gold/60 focus:shadow-[0_0_8px_rgba(212,175,55,0.2)]"
            />
            <div className="mt-1 text-right font-hud text-[9px] uppercase tracking-widest text-foreground/40">
              {bio.length}/160
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border/40 pt-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 rounded border border-border/60 px-3 py-1.5 font-hud text-[11px] uppercase tracking-widest text-foreground/70 hover:border-foreground/50 hover:text-foreground"
          >
            <X size={12} />
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="ml-auto inline-flex items-center gap-1.5 rounded border border-gold/60 bg-gold/15 px-4 py-1.5 font-hud text-[11px] font-bold uppercase tracking-widest text-gold shadow-[0_0_12px_rgba(212,175,55,0.3)] transition-all hover:bg-gold/25 hover:shadow-[0_0_16px_rgba(212,175,55,0.45)] disabled:opacity-50"
          >
            <Save size={12} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
