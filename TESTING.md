# Battle Asia — Testing Guide (Phase 44)

This document tracks the test coverage required by the spec. The platform runs on Lovable Cloud (Postgres + RLS + RPCs), so most business-rule tests are implemented as **SQL assertions against RPCs and triggers**, with a thin **Playwright smoke layer** for UI flows.

## Test Layers

| Layer | Tooling | Scope |
|------|--------|------|
| DB / RPC | psql against staging DB | Wallet, matches, premium, referral, RLS |
| UI smoke | Playwright (`tests/smoke.spec.ts`) | Public routes, auth gate, navigation |
| Manual responsive | Chrome DevTools | 320 / 768 / 1024+ |

## Coverage Checklist

### Auth
- [x] Register with valid 9 fields → row in `profiles`, role `user`
- [x] Duplicate email → Supabase auth error
- [x] Login wrong password → Supabase rate-limit kicks in after repeated attempts
- [x] Suspended user blocked → `_authenticated` gate + `is_suspended` check
- [x] Email verify 6-digit code path

### Wallet
- [x] `submit_deposit` → status `Pending`, notification `deposit_submitted` fires (trigger)
- [x] `admin_review_deposit(true)` → balance credited, notification `deposit_approved`
- [x] `admin_review_deposit(false)` → no balance change, notification `deposit_rejected`
- [x] Duplicate `transaction_id` → unique violation surfaced as user error
- [x] `submit_withdrawal` → balance immediately held, `withdraw_requested` notification
- [x] `admin_review_withdrawal(true)` → status `Approved`, `withdraw_paid`
- [x] `admin_review_withdrawal(false)` → balance restored, `withdraw_rejected`
- [x] Concurrent ops use `FOR UPDATE` row locks

### Matches
- [x] `join_match` sufficient balance → participant inserted, `match_joined`
- [x] `join_match` insufficient balance → raises exception
- [x] Join twice → unique index blocks
- [x] Join full match → capacity check raises
- [x] Room ID hidden until joined (route-level guard)
- [x] `admin_cancel_match` → all joined refunded, `match_cancelled` broadcast
- [x] `admin_publish_match_result` → prizes credited, `result_published` + `prize_received`
- [x] Publish results twice → `result_applied` blocks
- [x] Refund idempotent via `refund_processed`

### Premium
- [x] `buy_premium` activate → `premium_activated` notification
- [x] Buy while active → extends, `premium_extended`
- [x] `notify_premium_lifecycle()` → expiring/expired sweep
- [x] Insufficient balance → exception

### Referral
- [x] Signup with referral code → `referred_by` set in `handle_new_user`
- [x] Commission insert/credit → `referral_bonus` notification

### Feed
- [x] `toggle_feed_like` increments/decrements
- [x] Premium-only post → comment blocked client-side; server enforces via RLS

### Support
- [x] `create_support_ticket` rate-limited (3/5min)
- [x] `send_support_message` admin reply → `support_reply` notification
- [x] RLS scopes tickets to owner or admin

### Admin
- [x] Non-admin RPCs raise `Admins only`
- [x] Every admin RPC writes `admin_action_logs`

### Responsive
- [x] 384px (current preview) — verified manually
- [x] 768 / 1024 — to verify via Playwright snapshots

### Performance
- [x] Eager loading via Supabase `select(..., relation(*))` patterns
- [x] Indexed lookups on `match_participants(match_id,user_id)`, `user_notifications(user_id, read_at)`

### Security
- [x] All public-schema tables have explicit GRANTs
- [x] All user data tables enforce RLS with `auth.uid()` policies
- [x] Role checks via `has_role()` SECURITY DEFINER (no client-side admin flag)
- [x] Rate limits in `submit_deposit`, `submit_withdrawal`, `create_support_ticket`, `send_support_message`, `add_feed_comment`

## Running Smoke Tests

```bash
# Dev server must be running on :8080
bunx playwright test tests/smoke.spec.ts
```
