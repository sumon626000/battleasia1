# Battle Asia — Deployment Plan (Phase 45)

The original spec targeted Laravel + cPanel + MySQL. This project ships on **Lovable Cloud** (TanStack Start on Cloudflare Workers + Postgres + Storage + Auth), so the deployment plan is adapted to that stack.

## 1. Environments

| Env | URL | Purpose |
|-----|-----|---------|
| Preview | `id-preview--<project>.lovable.app` | Auto-deployed on every edit |
| Production | `battleasia1.lovable.app` (+ custom domain) | Updated when you click **Publish → Update** |

Backend (DB, RPCs, Storage, Auth) **deploys instantly** when migrations run. Frontend requires Publish.

## 2. Pre-Publish Checklist

- [ ] All 45 phases reviewed
- [ ] Admin account created (assign `admin` role via SQL: `INSERT INTO user_roles(user_id, role) VALUES ('<uuid>', 'admin');`)
- [ ] Seed data: `coin_rates`, `payment_channels`, `business_wallets`, `withdraw_configs`, `premium_settings`, `referral_configs`, `shop_categories`, `games`, `notification_templates`, `static_pages`, initial `apk_versions`
- [ ] Google OAuth provider configured in backend
- [ ] Site URL + redirect URLs include production domain
- [ ] Email templates configured (verify / reset / magic link)
- [ ] Run `notify_premium_lifecycle()` daily (pg_cron) — see below
- [ ] Security scan clean (no critical findings)
- [ ] Smoke tests pass (`bunx playwright test`)

## 3. Scheduled Jobs (pg_cron)

```sql
-- Daily premium expiring/expired notifications
select cron.schedule('premium_lifecycle_daily', '0 9 * * *',
  $$select public.notify_premium_lifecycle();$$);
```

## 4. Custom Domain

1. Publish to the Lovable URL first.
2. Project settings → Domains → **Connect Domain** → enter `battleasia.com`.
3. Add the A record for `@` and `www` → `185.158.133.1`, plus the `_lovable` TXT record at your registrar.
4. Wait for DNS propagation; SSL is provisioned automatically.

## 5. Backups & DR

- Lovable Cloud takes automated daily backups.
- Admin route `/admin/backups` shows the audit log.
- For exports, use the Cloud → Database → Tables CSV download.

## 6. Monitoring

- `/admin/online-users` — real-time active sessions
- `/admin/login-history` — IP / geo / device per login
- `/admin/security` — security alerts (unusual withdrawals, failed logins)
- `/admin/overview` — KPIs (users, matches, revenue)

## 7. Rollback

- Frontend: re-publish from a previous saved checkpoint in Lovable.
- Backend: schema migrations are forward-only — write a reverse migration if needed; data is recoverable from the daily backup.

## 8. Post-Launch

- [ ] Connect custom domain
- [ ] Hide "Edit with Lovable" badge (Pro plan)
- [ ] Configure email sending domain (Lovable Email)
- [ ] Submit `sitemap.xml` to Google Search Console
- [ ] Verify PWA install works on Android / iOS
- [ ] Publish first APK version via `/admin/apk`

## 9. Going Live

Click **Publish** in the top-right of Lovable. The site goes live at the Lovable URL in ~1 minute; custom domain takes a few minutes more after DNS verifies.
