DROP POLICY IF EXISTS "Authenticated can view participants" ON public.match_participants;
CREATE POLICY "Anyone can view participants" ON public.match_participants
  FOR SELECT TO anon, authenticated USING (true);