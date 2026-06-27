import { z } from "zod";

export const GAME_SERVERS = [
  { value: "Asia", label: "Asia" },
  { value: "Europe", label: "Europe" },
  { value: "SouthAmerica", label: "South America" },
  { value: "MiddleEast", label: "Middle East" },
  { value: "KRJP", label: "KRJP" },
] as const;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

export const registerSchema = z
  .object({
    in_game_username: z
      .string()
      .trim()
      .min(3, "In-game username must be at least 3 characters")
      .max(32, "In-game username must be 32 characters or less"),
    country_code: z
      .string()
      .trim()
      .regex(/^\+\d{1,4}$/, "Country code like +880"),
    mobile_number: z
      .string()
      .trim()
      .regex(/^\d{6,15}$/, "Enter a valid mobile number (digits only)"),
    pubg_id: z
      .string()
      .trim()
      .regex(/^\d{6,15}$/, "PUBG ID must be 6-15 digits"),
    game_server: z.enum(["Asia", "Europe", "SouthAmerica", "MiddleEast", "KRJP"], {
      errorMap: () => ({ message: "Select your game server" }),
    }),
    email: z.string().trim().email("Invalid email address").max(255),
    password: passwordSchema,
    password_confirmation: z.string(),
    terms_agreed: z.literal(true, {
      errorMap: () => ({ message: "You must accept the Terms and Privacy Policy" }),
    }),
    referral_code_input: z.string().trim().max(32).optional().or(z.literal("")),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const profileUpdateSchema = z.object({
  in_game_username: z.string().trim().min(3).max(32),
  display_name: z.string().trim().max(64).optional().or(z.literal("")),
  country_code: z.string().trim().regex(/^\+\d{1,4}$/, "Country code like +880"),
  mobile_number: z.string().trim().regex(/^\d{6,15}$/, "Enter a valid mobile number"),
  pubg_id: z.string().trim().regex(/^\d{6,15}$/, "PUBG ID must be 6-15 digits"),
  game_server: z.enum(["Asia", "Europe", "SouthAmerica", "MiddleEast", "KRJP"]),
});
export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;

export const passwordChangeSchema = z
  .object({
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
