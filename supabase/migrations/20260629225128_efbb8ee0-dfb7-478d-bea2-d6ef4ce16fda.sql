
-- =========================================================
-- profiles: column-level access for anon
-- =========================================================
REVOKE SELECT (active_session_token, mobile_number, suspension_reason, referred_by, bac_coin_balance, premium_expires_at)
  ON public.profiles FROM anon;
REVOKE SELECT (active_session_token) ON public.profiles FROM authenticated;

-- =========================================================
-- matches: hide room credentials from anon
-- =========================================================
REVOKE SELECT (room_id, room_password) ON public.matches FROM anon;

-- =========================================================
-- match_participants: restrict to authenticated users
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view participants" ON public.match_participants;
CREATE POLICY "Authenticated can view participants"
ON public.match_participants FOR SELECT
TO authenticated USING (true);

-- =========================================================
-- feed_posts: gate premium_only posts to premium members
-- =========================================================
DROP POLICY IF EXISTS "Published posts public" ON public.feed_posts;
CREATE POLICY "Published posts public (non-premium)"
ON public.feed_posts FOR SELECT
TO anon, authenticated
USING (
  deleted_at IS NULL
  AND status = 'Published'
  AND premium_only = false
);
CREATE POLICY "Published premium posts visible to premium users"
ON public.feed_posts FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND status = 'Published'
  AND premium_only = true
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_premium = true
  )
);

-- =========================================================
-- website_settings: filter sensitive keys
-- =========================================================
DROP POLICY IF EXISTS "Site settings public" ON public.website_settings;
CREATE POLICY "Site settings public (safe keys)"
ON public.website_settings FOR SELECT
TO anon, authenticated
USING (
  key NOT ILIKE '%secret%'
  AND key NOT ILIKE '%password%'
  AND key NOT ILIKE '%api_key%'
  AND key NOT ILIKE '%api-key%'
  AND key NOT ILIKE '%token%'
  AND key NOT ILIKE '%webhook%'
  AND key NOT ILIKE '%private%'
);

-- =========================================================
-- notifications: per-audience visibility
-- =========================================================
DROP POLICY IF EXISTS "Notifications visible to all auth" ON public.notifications;
CREATE POLICY "Notifications visible by audience"
ON public.notifications FOR SELECT
TO authenticated
USING (
  audience_type::text = 'all'
  OR (
    audience_type::text = 'premium'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_premium = true
    )
  )
);
