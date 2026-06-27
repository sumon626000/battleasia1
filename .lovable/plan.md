# Gaming Feed (Insta-style) — Phased Plan

Build a clean Instagram-like feed inside `/dashboard/feed` with full HUD/gaming visual language (gold accents, tactical panels, dark surface). Existing tables (`feed_posts`, `feed_comments`, `feed_likes`, `feed_categories`, `profiles`) will be reused and extended.

## Scope (only these features)
- Create post (image / video / text)
- Like + Comment (reply optional, later phase)
- Follow / Unfollow
- Block user
- Direct Message (1-to-1)
- Profile click → user page with followers / following counts
- Phase-by-phase rollout, gaming UI throughout

Out of scope: stories, reels algorithm, group chats, voice/video calls, hashtags trending, ads.

---

## Phase 1 — Schema & Storage
- New tables: `user_follows`, `user_blocks`, `direct_threads`, `direct_messages`, `post_media` (multi-image support)
- Extend `feed_posts` with `media_type`, `visibility`, `is_edited`
- Storage bucket: `feed-media` (public read, auth write, 25MB cap)
- RLS: blocked users hidden everywhere; messages only between participants
- Realtime enabled on `feed_posts`, `feed_comments`, `feed_likes`, `direct_messages`

## Phase 2 — Feed Home (read)
- Vertical scroll feed (Insta card layout, gaming border)
- Post card: avatar + username + time, media carousel, caption, like / comment counts
- Skeleton loaders, infinite scroll (pagination by 10)
- Filter chips: All / Following / Trending

## Phase 3 — Create Post
- Floating "+" HUD button → modal
- Upload image(s) or video (drag-drop + preview)
- Caption + category select
- Progress bar during upload, optimistic insert

## Phase 4 — Like & Comment
- Double-tap to like (with burst animation)
- Comment drawer (bottom sheet on mobile, side panel on desktop)
- Realtime updates of counts + new comments
- Delete own comment

## Phase 5 — Profile Page (`/u/$username`)
- Hero banner, avatar, bio, stats: posts / followers / following
- Tabs: Posts grid (3-col), Liked, About
- Follow / Unfollow / Block / Message buttons (sticky on mobile)
- Followers / Following list modals

## Phase 6 — Follow System
- Follow/unfollow with optimistic UI
- "Following" feed filter actually uses graph
- Suggested players widget (mutuals / top-rank)
- Notifications on new follower

## Phase 7 — Block System
- Block hides their posts, comments, profile, blocks DM
- Manage blocked list in dashboard settings
- Mutual hide (neither can see the other)

## Phase 8 — Direct Messages
- Inbox list (`/dashboard/messages`)
- Thread view: bubbles, send text + image, typing indicator
- Realtime delivery, read receipts
- Cannot DM blocked users / users who blocked you

## Phase 9 — Notifications & Polish
- Notify on: like, comment, follow, message
- Bell badge in topbar with realtime counter
- Empty states + gaming illustrations
- Mobile bottom-sheet polish, animations, accessibility pass

---

## Technical Notes
- Stack: TanStack Start + Supabase, TanStack Query for cache, realtime channels per route
- Reuse `DashboardShell`, `CoinIcon`, HUD tokens — no new design system
- All policies via `has_role` + `auth.uid()`; service_role grants for admin moderation
- Media via Supabase Storage signed URLs (videos) / public URLs (images)
- Each phase ships independently; you say number, I build that phase

Reply **"1"** and I start Phase 1 (schema + storage).
