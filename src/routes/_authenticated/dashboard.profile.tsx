import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Camera,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Trash2,
  Save,
  Copy,
  Crown,
  ImagePlus,
  Link2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import {
  profileUpdateSchema,
  passwordChangeSchema,
  type ProfileUpdateValues,
  type PasswordChangeValues,
} from "@/lib/auth-validation";
import { CountryCodeSelect } from "@/components/site/CountryCodeSelect";
import { GameServerSelect } from "@/components/site/GameServerSelect";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
});

const SERVER_OPTIONS = [
  { value: "Europe", label: "Europe", hint: "EU" },
  { value: "Asia", label: "Asia", hint: "AS" },
  { value: "SouthAmerica", label: "South America", hint: "SA" },
  { value: "MiddleEast", label: "Middle East", hint: "ME" },
  { value: "KRJP", label: "Korea / Japan", hint: "KR · JP" },
];

function SectionCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hud-panel relative overflow-hidden p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="font-display text-base font-bold uppercase tracking-wider text-gold">
          {title}
        </h2>
        {desc && <p className="mt-0.5 text-xs text-foreground/60">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function ProfilePage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [hasPendingDelete, setHasPendingDelete] = useState(false);
  const [bio, setBio] = useState("");
  const [social, setSocial] = useState({
    facebook: "",
    twitter: "",
    instagram: "",
    youtube: "",
    discord: "",
    website: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const emailConfirmed = !!user?.email_confirmed_at;

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    setValue,
    watch,
    reset: resetProfile,
    formState: { errors: errProfile },
  } = useForm<ProfileUpdateValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      in_game_username: "",
      display_name: "",
      country_code: "+880",
      mobile_number: "",
      pubg_id: "",
      game_server: "Asia",
    },
  });

  const {
    register: regPw,
    handleSubmit: handlePw,
    reset: resetPw,
    formState: { errors: errPw },
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
  });

  // Hydrate form when profile loads
  useEffect(() => {
    if (!profile) return;
    resetProfile({
      in_game_username: profile.in_game_username ?? "",
      display_name: profile.display_name ?? "",
      country_code: profile.country_code ?? "+880",
      mobile_number: profile.mobile_number ?? "",
      pubg_id: profile.pubg_id ?? "",
      game_server: (profile.game_server as ProfileUpdateValues["game_server"]) ?? "Asia",
    });
    setBio((profile as { bio?: string | null }).bio ?? "");
    const sl = ((profile as { social_links?: Record<string, string> }).social_links ?? {}) as Record<string, string>;
    setSocial({
      facebook: sl.facebook ?? "",
      twitter: sl.twitter ?? "",
      instagram: sl.instagram ?? "",
      youtube: sl.youtube ?? "",
      discord: sl.discord ?? "",
      website: sl.website ?? "",
    });
  }, [profile, resetProfile]);

  // Check pending delete request
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase
      .from("account_delete_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle()
      .then(({ data }) => {
        if (active) setHasPendingDelete(!!data);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      toast.error("Please choose a PNG, JPG, WEBP or GIF image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or less");
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      // Private bucket → signed URL (1 year)
      const { data: signed, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signed) throw signErr || new Error("Failed to sign URL");
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: signed.signedUrl })
        .eq("id", user.id);
      if (profErr) throw profErr;
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      toast.error("Please choose a PNG, JPG or WEBP image");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Cover must be 8MB or less");
      return;
    }
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("covers")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signed) throw signErr || new Error("Failed to sign URL");
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ cover_url: signed.signedUrl })
        .eq("id", user.id);
      if (profErr) throw profErr;
      toast.success("Cover updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  async function onSaveSocial() {
    if (!user) return;
    setSavingSocial(true);
    try {
      const cleaned = Object.fromEntries(
        Object.entries(social).filter(([, v]) => v.trim().length > 0),
      );
      const { error } = await supabase
        .from("profiles")
        .update({ bio: bio.trim() || null, social_links: cleaned })
        .eq("id", user.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Social profile updated");
    } finally {
      setSavingSocial(false);
    }
  }

  async function onSaveProfile(values: ProfileUpdateValues) {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          in_game_username: values.in_game_username,
          display_name: values.display_name || null,
          country_code: values.country_code,
          mobile_number: values.mobile_number,
          pubg_id: values.pubg_id,
          game_server: values.game_server,
        })
        .eq("id", user.id);
      if (error) {
        if (error.code === "23505") {
          toast.error("That PUBG ID is already in use by another player");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Profile updated");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword(values: PasswordChangeValues) {
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.new_password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password changed");
      resetPw({ new_password: "", confirm_password: "" });
    } finally {
      setChangingPw(false);
    }
  }

  async function resendVerificationEmail() {
    if (!user?.email) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    if (error) toast.error(error.message);
    else toast.success("Verification email sent");
  }

  async function submitDeleteRequest() {
    if (!user) return;
    setSubmittingDelete(true);
    try {
      const { error } = await supabase
        .from("account_delete_requests")
        .insert({ user_id: user.id, reason: deleteReason.trim() || null });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Account deletion request submitted");
      setHasPendingDelete(true);
      setDeleteReason("");
    } finally {
      setSubmittingDelete(false);
    }
  }

  function copyReferral() {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    toast.success("Referral code copied");
  }

  const initials = (profile?.in_game_username || profile?.username || "PL").slice(0, 2).toUpperCase();
  const balance = Number(profile?.bac_coin_balance ?? 0);
  const coverUrl = (profile as { cover_url?: string | null } | null)?.cover_url ?? null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="hud-panel relative overflow-hidden p-5 sm:p-6">
        {/* Cover image */}
        <div
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-gold/10 to-transparent"
          style={
            coverUrl
              ? {
                  backgroundImage: `linear-gradient(to bottom, rgba(8,10,14,0.35), rgba(8,10,14,0.95)), url(${coverUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        />
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-sm border border-gold/60 bg-background/80 px-2 py-1 font-hud text-[10px] uppercase tracking-widest text-gold backdrop-blur transition hover:bg-gold hover:text-background disabled:opacity-60"
        >
          {uploadingCover ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
          {coverUrl ? "Change Cover" : "Add Cover"}
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={onCoverChange}
        />
        <div className="relative z-[1] flex flex-col items-center gap-4 pt-12 sm:flex-row sm:items-center sm:gap-6 sm:pt-16">
          <div className="relative">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-md border-2 border-gold/60 bg-gold/10 sm:h-28 sm:w-28">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.in_game_username || "Avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-3xl font-bold text-gold">{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-md border border-gold/70 bg-background text-gold transition hover:bg-gold hover:text-background disabled:opacity-60"
              aria-label="Change avatar"
            >
              {uploadingAvatar ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Camera size={15} />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={onAvatarChange}
            />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="truncate font-display text-2xl font-bold uppercase tracking-wide">
              {profile?.in_game_username || "PLAYER"}
            </h1>
            <p className="mt-1 truncate font-mono text-xs text-foreground/60">{user?.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {profile?.is_premium && (
                <span className="inline-flex items-center gap-1 rounded-sm border border-gold/60 bg-gold/10 px-2 py-0.5 font-hud text-[10px] font-bold uppercase text-gold">
                  <Crown size={10} /> Premium
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-hud text-[10px] font-bold uppercase ${
                  emailConfirmed
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-destructive/60 bg-destructive/10 text-destructive"
                }`}
              >
                {emailConfirmed ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                {emailConfirmed ? "Email Verified" : "Email Not Verified"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-secondary/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground/80">
                BAC {balance.toLocaleString()}
              </span>
            </div>
          </div>
          {profile?.referral_code && (
            <button
              onClick={copyReferral}
              className="hud-panel flex w-full items-center justify-between gap-3 px-3 py-2 transition hover:border-gold/60 sm:w-auto"
            >
              <div className="text-left">
                <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                  Referral Code
                </div>
                <div className="font-mono text-sm font-bold text-gold">
                  {profile.referral_code}
                </div>
              </div>
              <Copy size={14} className="text-foreground/60" />
            </button>
          )}
        </div>
        {!emailConfirmed && (
          <div className="mt-4 flex flex-col items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-foreground/80">
              Verify your email to unlock withdrawals and tournament prizes.
            </p>
            <button
              onClick={resendVerificationEmail}
              className="rounded-sm border border-destructive/60 px-3 py-1 font-hud text-[11px] font-bold uppercase text-destructive transition hover:bg-destructive hover:text-background"
            >
              Resend Verification
            </button>
          </div>
        )}
      </div>

      {/* Account info */}
      <SectionCard title="Account Information" desc="Edit your in-game identity and contact details.">
        <form onSubmit={handleProfile(onSaveProfile)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="IN-GAME USERNAME"
              error={errProfile.in_game_username?.message}
              {...regProfile("in_game_username")}
            />
            <Field
              label="DISPLAY NAME"
              placeholder="Optional"
              error={errProfile.display_name?.message}
              {...regProfile("display_name")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CountryCodeSelect
              value={watch("country_code")}
              onChange={(v) => setValue("country_code", v, { shouldValidate: true })}
              error={errProfile.country_code?.message}
            />
            <Field
              label="MOBILE NUMBER"
              inputMode="numeric"
              error={errProfile.mobile_number?.message}
              {...regProfile("mobile_number")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="PUBG ID"
              inputMode="numeric"
              error={errProfile.pubg_id?.message}
              {...regProfile("pubg_id")}
            />
            <GameServerSelect
              value={watch("game_server")}
              onChange={(v) =>
                setValue("game_server", v as ProfileUpdateValues["game_server"], {
                  shouldValidate: true,
                })
              }
              options={SERVER_OPTIONS}
              error={errProfile.game_server?.message}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={savingProfile}
              className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 font-hud text-sm font-bold uppercase tracking-wider disabled:opacity-60"
            >
              {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Password */}
      <SectionCard title="Bio & Social Links" desc="Tell other players about yourself and link your channels.">
        <div className="grid gap-4">
          <label className="block">
            <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">BIO</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="A short tagline shown on your public profile"
              className="mt-1 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50"
            />
            <div className="mt-1 text-right text-[10px] text-foreground/50">{bio.length}/280</div>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["facebook", "Facebook URL"],
                ["twitter", "X / Twitter URL"],
                ["instagram", "Instagram URL"],
                ["youtube", "YouTube URL"],
                ["discord", "Discord invite / tag"],
                ["website", "Website URL"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">{label}</span>
                <div className="relative mt-1">
                  <Link2 size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
                  <input
                    value={social[key]}
                    onChange={(e) => setSocial((s) => ({ ...s, [key]: e.target.value }))}
                    placeholder="https://…"
                    className="w-full rounded-md border border-border bg-background/80 px-3 py-2.5 pl-8 text-sm outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50"
                  />
                </div>
              </label>
            ))}
          </div>
          <div>
            <button
              type="button"
              onClick={onSaveSocial}
              disabled={savingSocial}
              className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 font-hud text-sm font-bold uppercase tracking-wider disabled:opacity-60"
            >
              {savingSocial ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Social Profile
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Change Password" desc="Use a strong, unique password you don't use elsewhere.">
        <form onSubmit={handlePw(onChangePassword)} className="grid gap-4 sm:grid-cols-2">
          <Field
            label="NEW PASSWORD"
            type="password"
            error={errPw.new_password?.message}
            {...regPw("new_password")}
          />
          <Field
            label="CONFIRM PASSWORD"
            type="password"
            error={errPw.confirm_password?.message}
            {...regPw("confirm_password")}
          />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={changingPw}
              className="btn-gold inline-flex items-center gap-2 px-5 py-2.5 font-hud text-sm font-bold uppercase tracking-wider disabled:opacity-60"
            >
              {changingPw ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <KeyRound size={14} />
              )}
              Update Password
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard
        title="Danger Zone"
        desc="Request permanent deletion of your account. An admin will review your request."
      >
        {hasPendingDelete ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground/80">
            Your account deletion request is pending admin review. Contact support if you change
            your mind.
          </div>
        ) : (
          <div className="grid gap-3">
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Tell us why you're leaving (optional)"
              rows={3}
              maxLength={500}
              className="w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm outline-none transition focus:border-destructive focus:ring-1 focus:ring-destructive/40"
            />
            <div>
              <button
                onClick={submitDeleteRequest}
                disabled={submittingDelete}
                className="inline-flex items-center gap-2 rounded-md border border-destructive/60 bg-destructive/10 px-5 py-2.5 font-hud text-sm font-bold uppercase tracking-wider text-destructive transition hover:bg-destructive hover:text-background disabled:opacity-60"
              >
                {submittingDelete ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Request Account Deletion
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

const Field = ({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) => (
  <label className="block">
    <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
      {label}
    </span>
    <input
      {...props}
      className={`mt-1 w-full rounded-md border bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50 ${
        error ? "border-destructive" : "border-border"
      }`}
    />
    {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
  </label>
);
