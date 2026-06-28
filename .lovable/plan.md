
# Theme System with BAC Coin Unlocks

## Goal
- Add 2 new themes (**Cyber Neon**, **Blood Crimson**) alongside current **Tactical Amber** (free default).
- Prominent, eye-catching theme switcher (not hidden in settings).
- Locked themes must be purchased with **BAC Coins** at admin-set prices.
- Admin can manage everything: enable/disable themes, set prices, see who purchased what.

---

## 1. Database (migration)

**`theme_config`** — admin-controlled theme catalog
- `id` (text, PK) — `amber` / `cyber` / `blood`
- `name`, `description`, `preview_color` (hex for swatch)
- `price_bac` (numeric) — 0 = free
- `is_active` (bool) — admin can disable a theme
- `is_default` (bool) — only one (amber)
- `sort_order` (int)
- RLS: anyone reads active themes; only admins write.
- Seed: amber (free, default), cyber (500 BAC), blood (500 BAC).

**`user_theme_purchases`** — who owns which theme
- `id`, `user_id` → auth.users, `theme_id` → theme_config
- `price_paid_bac`, `purchased_at`
- UNIQUE(user_id, theme_id)
- RLS: user reads/inserts own; admin reads all.

**`profiles.active_theme`** (text, default `'amber'`) — currently applied theme.

**RPC `purchase_theme(_theme_id)`** — atomic:
- Check theme active & not already owned
- Check balance >= price
- Deduct balance, log to `balance_logs`, insert purchase row
- Returns `{success, message, balance}`

---

## 2. Theme CSS Architecture

In `src/styles.css`, add 2 new variable blocks scoped by `[data-theme="..."]`:
- `[data-theme="cyber"]` — purple-black bg, cyan + magenta accent, neon glow, futuristic
- `[data-theme="blood"]` — black bg, blood red + bone white, aggressive sharp edges

Each block overrides: `--primary`, `--accent`, `--gold`, `--card`, `--border`, `--background`, glow shadows, button gradients. Existing `btn-gold`, `hud-panel`, `chip-tag` utilities all use these variables → **zero component changes** needed.

`<html data-theme="...">` set from `ThemeProvider` reading `profiles.active_theme` (with `localStorage` fallback for instant load).

---

## 3. Prominent Theme Switcher

**Top-right `ThemeSwitcher` button** in `DashboardTopbar` (next to balance):
- Glowing palette icon with current theme color pulse
- Click → opens animated modal with 3 large theme preview cards (showing actual button/card mockup in each theme)
- Each card shows: name, preview, "ACTIVE" / "APPLY" / "🔒 500 BAC UNLOCK"
- Locked themes → confirm modal → calls `purchase_theme` RPC → balance deducts → instantly applies

Also added to mobile drawer header for visibility.

---

## 4. Admin Panel — `/admin/themes`

New route `src/routes/_admin/admin.themes.tsx`:
- Table of all themes with: name, price (editable), active toggle, total purchases, total BAC earned
- Edit price inline
- Enable/disable theme (disabled = hidden from users, existing owners keep access)
- View purchase history per theme (user, date, amount)
- Add to admin sidebar under "Economy" section

---

## 5. Files to Create/Modify

**New files:**
- `src/components/site/ThemeSwitcher.tsx` — button + modal
- `src/components/site/ThemeProvider.tsx` — applies `data-theme` globally
- `src/lib/themes.ts` — theme metadata constants
- `src/routes/_admin/admin.themes.tsx` — admin config UI

**Modified:**
- `src/styles.css` — add `[data-theme="cyber"]` and `[data-theme="blood"]` variable blocks
- `src/components/dashboard/DashboardTopbar.tsx` — mount ThemeSwitcher
- `src/components/site/SiteHeader.tsx` — mount ThemeSwitcher (for logged-out users see default)
- `src/routes/__root.tsx` — wrap in `<ThemeProvider>`
- `src/components/admin/AdminShell.tsx` — add "Themes" nav link

---

## 6. Behavior Summary

| Action | Result |
|---|---|
| New user | Default Amber theme applied |
| Click locked theme | Confirm "Spend 500 BAC?" → deduct → unlock + apply |
| Insufficient balance | Toast: "Need 500 BAC, you have X" + link to Vault |
| Admin disables a theme | Hidden from new buyers; current users keep it |
| Admin changes price | New buyers pay new price; existing owners unaffected |

---

## Out of scope (for this round)
- Per-component custom layouts per theme (only colors/glow/effects change)
- Theme preview before purchase animation (can add later)
- Refunds / gifting themes

Confirm করলে implementation শুরু করি 👍
