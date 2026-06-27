import { forwardRef } from "react";
import { createFileRoute, Link, useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import authHero from "@/assets/auth-hero.jpg";
import logoShield from "@/assets/logo-shield.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  loginSchema,
  registerSchema,
  type LoginValues,
  type RegisterValues,
} from "@/lib/auth-validation";
import { LegalModal } from "@/components/site/LegalModal";
import { CountryCodeSelect } from "@/components/site/CountryCodeSelect";
import { GameServerSelect } from "@/components/site/GameServerSelect";

const searchSchema = z.object({
  ref: z.string().trim().optional(),
  tab: z.enum(["login", "register"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign In or Register | Battle Asia" },
      {
        name: "description",
        content:
          "Join Battle Asia esports arena. Log in or create your free account to compete in PUBG tournaments.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-2xl text-gold">Auth error</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn-gold mt-4 px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8 text-center">Not found</div>,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [tab, setTab] = useState<"login" | "register">(search.tab ?? "login");
  const [busy, setBusy] = useState(false);
  const [legal, setLegal] = useState<"terms" | "privacy" | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    supabase
      .from("website_settings")
      .select("value")
      .eq("key", "google_login_enabled")
      .maybeSingle()
      .then(({ data }) => setGoogleEnabled(String((data as any)?.value ?? "false") === "true"));
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    setBusy(false);
    if (result.error) return toast.error(result.error.message ?? "Google sign-in failed");
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)] w-full">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-2 lg:gap-12 lg:py-12">
        {/* Hero side */}
        <aside className="relative hidden overflow-hidden rounded-xl border border-border/70 lg:block">
          <img
            src={authHero}
            alt="Battle Asia warrior"
            width={1024}
            height={1536}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,176,32,0.18),transparent_55%)]" />
          <span className="hud-bracket hud-bracket-tl" />
          <span className="hud-bracket hud-bracket-tr" />
          <span className="hud-bracket hud-bracket-bl" />
          <span className="hud-bracket hud-bracket-br" />
          <div className="relative z-10 flex h-full flex-col justify-between p-8">
            <Link to="/" className="group flex items-center gap-3">
              <img src={logoShield} alt="Battle Asia" className="h-14 w-14 object-contain drop-shadow-[0_0_18px_rgba(255,176,32,0.5)]" />
              <div className="font-display text-xl font-bold leading-none">
                <div>BATTLE</div>
                <div className="text-gold">ASIA</div>
              </div>
            </Link>
            <div>
              <div className="font-mono text-[10px] tracking-[0.3em] text-gold/80">// MISSION BRIEFING</div>
              <h2 className="font-display mt-2 text-4xl font-black uppercase leading-tight tracking-wide text-foreground">
                Drop In.<br />Loot Up.<br /><span className="text-gold">Win Big.</span>
              </h2>
              <p className="mt-3 max-w-sm text-sm text-foreground/70">
                Join thousands of warriors competing in daily PUBG tournaments across Asia.
              </p>
            </div>
          </div>
        </aside>

        {/* Form side */}
        <section className="flex flex-col justify-center">
          {/* Mobile header */}
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoShield} alt="Battle Asia" className="h-12 w-12 object-contain drop-shadow-[0_0_14px_rgba(255,176,32,0.5)]" />
              <div className="font-display text-base font-bold leading-none">
                <div>BATTLE</div>
                <div className="text-gold">ASIA</div>
              </div>
            </Link>
            <Link to="/" className="btn-outline-gold inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <ArrowLeft size={12} /> HOME
            </Link>
          </div>

          {/* Desktop back-home pill */}
          <div className="mb-4 hidden lg:flex">
            <Link to="/" className="btn-outline-gold inline-flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <ArrowLeft size={12} /> BACK TO HOME
            </Link>
          </div>

          <div className="hud-panel relative mx-auto w-full max-w-lg overflow-hidden border border-border/80 bg-card/80 p-6 backdrop-blur">
            <span className="hud-bracket hud-bracket-tl" />
            <span className="hud-bracket hud-bracket-tr" />
            <span className="hud-bracket hud-bracket-bl" />
            <span className="hud-bracket hud-bracket-br" />

            <h1 className="font-display text-3xl font-bold tracking-wide text-foreground">
              {tab === "login" ? "ENTER THE ARENA" : "JOIN THE BATTLE"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "login"
                ? "Sign in to your Battle Asia account"
                : "Create your free Battle Asia account"}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-1 rounded-md border border-border bg-background/60 p-1">
              <button
                onClick={() => setTab("login")}
                className={`font-hud rounded px-3 py-2 text-sm font-semibold transition ${
                  tab === "login" ? "bg-gold text-black" : "text-foreground/70 hover:text-gold"
                }`}
              >
                LOGIN
              </button>
              <button
                onClick={() => setTab("register")}
                className={`font-hud rounded px-3 py-2 text-sm font-semibold transition ${
                  tab === "register" ? "bg-gold text-black" : "text-foreground/70 hover:text-gold"
                }`}
              >
                REGISTER
              </button>
            </div>

            {tab === "login" ? (
              <LoginForm busy={busy} setBusy={setBusy} />
            ) : (
              <RegisterForm
                busy={busy}
                setBusy={setBusy}
                refCode={search.ref ?? ""}
                openLegal={(t) => setLegal(t)}
                onRegistered={(email) => navigate({ to: "/email/verify", search: { email } })}
              />
            )}

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={handleGoogle}
              disabled={busy}
              className="btn-outline-gold w-full justify-center py-3 text-sm disabled:opacity-60"
            >
              CONTINUE WITH GOOGLE
            </button>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              By continuing you agree to the{" "}
              <button onClick={() => setLegal("terms")} className="text-gold hover:underline">
                Terms
              </button>{" "}
              and{" "}
              <button onClick={() => setLegal("privacy")} className="text-gold hover:underline">
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </section>
      </div>

      <LegalModal type={legal ?? "terms"} open={legal !== null} onClose={() => setLegal(null)} />
    </div>
  );
}

/* ---------------- Login ---------------- */

function LoginForm({ busy, setBusy }: { busy: boolean; setBusy: (b: boolean) => void }) {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        toast.error("Email not verified. Check your inbox.");
        navigate({ to: "/email/verify", search: { email: values.email } });
        return;
      }
      return toast.error(error.message);
    }
    toast.success("Welcome back, soldier");
    navigate({ to: "/dashboard" });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3">
      <Field label="EMAIL" type="email" placeholder="you@example.com" {...register("email")} error={errors.email?.message} />
      <PasswordField
        label="PASSWORD"
        show={showPwd}
        onToggle={() => setShowPwd((v) => !v)}
        registration={register("password")}
        error={errors.password?.message}
      />
      <a href="/forgot-password" className="block text-xs font-semibold text-gold hover:underline">
        Forgot password?
      </a>
      <button type="submit" disabled={busy} className="btn-gold w-full justify-center py-3 text-sm disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "LOGIN"}
      </button>
    </form>
  );
}

/* ---------------- Register ---------------- */

function RegisterForm({
  busy,
  setBusy,
  refCode,
  openLegal,
  onRegistered,
}: {
  busy: boolean;
  setBusy: (b: boolean) => void;
  refCode: string;
  openLegal: (t: "terms" | "privacy") => void;
  onRegistered: (email: string) => void;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      country_code: "+880",
      game_server: "Asia",
      referral_code_input: refCode,
      terms_agreed: false as unknown as true,
    },
  });

  const password = watch("password") ?? "";
  const strength = useMemo(() => passwordStrength(password), [password]);

  async function onSubmit(values: RegisterValues) {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/email/verify`,
        data: {
          username: values.in_game_username,
          display_name: values.in_game_username,
          in_game_username: values.in_game_username,
          country_code: values.country_code,
          mobile_number: values.mobile_number,
          pubg_id: values.pubg_id,
          game_server: values.game_server,
          referral_code_input: values.referral_code_input || null,
        },
      },
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        return toast.error("This email is already registered. Try logging in.");
      }
      return toast.error(error.message);
    }
    toast.success("Account created — check your email for the verification code");
    onRegistered(values.email);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3">
      <Field
        label="IN-GAME USERNAME"
        placeholder="ProSniper99"
        {...register("in_game_username")}
        error={errors.in_game_username?.message}
      />

      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
        <CountryCodeSelect
          label="CODE"
          value={watch("country_code") ?? ""}
          onChange={(v) => setValue("country_code", v, { shouldValidate: true })}
          error={errors.country_code?.message}
        />
        <Field
          label="MOBILE NUMBER"
          placeholder="17XXXXXXXX"
          inputMode="numeric"
          {...register("mobile_number")}
          error={errors.mobile_number?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="PUBG ID"
          placeholder="5123456789"
          inputMode="numeric"
          {...register("pubg_id")}
          error={errors.pubg_id?.message}
        />
        <GameServerSelect
          label="GAME SERVER"
          value={watch("game_server")}
          onChange={(v) => setValue("game_server", v as RegisterValues["game_server"], { shouldValidate: true })}
          options={[
            { value: "Europe", label: "Europe", hint: "EU" },
            { value: "Asia", label: "Asia", hint: "AS" },
            { value: "SouthAmerica", label: "South America", hint: "SA" },
            { value: "MiddleEast", label: "Middle East", hint: "ME" },
            { value: "KRJP", label: "Korea / Japan", hint: "KR · JP" },
          ]}
          error={errors.game_server?.message}
        />
      </div>

      <Field
        label="EMAIL"
        type="email"
        placeholder="you@example.com"
        {...register("email")}
        error={errors.email?.message}
      />

      <PasswordField
        label="PASSWORD"
        show={showPwd}
        onToggle={() => setShowPwd((v) => !v)}
        registration={register("password")}
        error={errors.password?.message}
      />
      <PasswordStrengthBar score={strength.score} label={strength.label} />

      <PasswordField
        label="CONFIRM PASSWORD"
        show={showPwd2}
        onToggle={() => setShowPwd2((v) => !v)}
        registration={register("password_confirmation")}
        error={errors.password_confirmation?.message}
      />

      <Field
        label="REFERRAL CODE (OPTIONAL)"
        placeholder="BA12345678"
        {...register("referral_code_input")}
        error={errors.referral_code_input?.message}
      />

      <label className="mt-2 flex items-start gap-2 text-xs text-foreground/80">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[hsl(var(--gold))]"
          {...register("terms_agreed")}
        />
        <span>
          I agree to the{" "}
          <button type="button" onClick={() => openLegal("terms")} className="text-gold hover:underline">
            Terms
          </button>{" "}
          and{" "}
          <button type="button" onClick={() => openLegal("privacy")} className="text-gold hover:underline">
            Privacy Policy
          </button>
          .
        </span>
      </label>
      {errors.terms_agreed && (
        <p className="text-[11px] text-destructive">{errors.terms_agreed.message as string}</p>
      )}

      <button type="submit" disabled={busy} className="btn-gold w-full justify-center py-3 text-sm disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "CREATE ACCOUNT"}
      </button>
    </form>
  );
}

/* ---------------- Reusable fields ---------------- */

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, className, ...rest },
  ref,
) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        ref={ref}
        {...rest}
        className={`mt-1 w-full rounded-md border bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50 ${
          error ? "border-destructive" : "border-border"
        } ${className ?? ""}`}
      />
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </label>
  );
});

function PasswordField({
  label,
  show,
  onToggle,
  registration,
  error,
}: {
  label: string;
  show: boolean;
  onToggle: () => void;
  registration: ReturnType<ReturnType<typeof useForm>["register"]>;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="relative mt-1">
        <input
          type={show ? "text" : "password"}
          {...registration}
          className={`w-full rounded-md border bg-background/80 px-3 py-2.5 pr-10 text-sm text-foreground outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50 ${
            error ? "border-destructive" : "border-border"
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-foreground/60 hover:text-gold"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  error?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full rounded-md border bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-gold focus:ring-1 focus:ring-gold/50 ${
          error ? "border-destructive" : "border-border"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-background">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </label>
  );
}

function PasswordStrengthBar({ score, label }: { score: number; label: string }) {
  const colors = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-amber-400", "bg-emerald-500"];
  return (
    <div className="space-y-1">
      <div className="flex h-1.5 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded ${i < score ? colors[score] : "bg-border"}`}
          />
        ))}
      </div>
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
        STRENGTH: <span className="text-foreground/80">{label}</span>
      </p>
    </div>
  );
}

function passwordStrength(pwd: string): { score: number; label: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] };
}
