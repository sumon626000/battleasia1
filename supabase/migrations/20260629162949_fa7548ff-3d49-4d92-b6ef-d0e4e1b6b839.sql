-- 1. Lock down match room credentials
REVOKE SELECT (room_id, room_password) ON public.matches FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_match_credentials(_match_id uuid)
RETURNS TABLE(room_id text, room_password text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_admin() OR EXISTS (
    SELECT 1 FROM public.match_participants mp
    WHERE mp.match_id = _match_id AND mp.user_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT m.room_id, m.room_password FROM public.matches m WHERE m.id = _match_id;
  END IF;
  RETURN;
END;
$$;
REVOKE ALL ON FUNCTION public.get_match_credentials(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_match_credentials(uuid) TO authenticated;

-- 2. Hide session token from all clients; hide mobile from anonymous visitors
REVOKE SELECT (active_session_token) ON public.profiles FROM anon, authenticated;
REVOKE SELECT (mobile_number) ON public.profiles FROM anon;

-- 3. Require authentication to read participant lists
DROP POLICY IF EXISTS "Anyone can view participants" ON public.match_participants;
CREATE POLICY "Authenticated can view participants" ON public.match_participants
  FOR SELECT TO authenticated USING (true);

-- 4. Restrict chatbot internal settings (system_prompt, model) from anon visitors
REVOKE SELECT ON public.chatbot_settings FROM anon;
GRANT SELECT (id, enabled, welcome_message, bubble_title) ON public.chatbot_settings TO anon;