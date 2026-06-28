-- Single-device login enforcement
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_session_token TEXT;

-- Claim the current device as the only active one for this user
CREATE OR REPLACE FUNCTION public.claim_active_session(_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET active_session_token = _token WHERE id = auth.uid();
END;
$$;

-- Check whether this device still owns the active session
CREATE OR REPLACE FUNCTION public.is_active_session(_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  current_token TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN TRUE; END IF;
  SELECT active_session_token INTO current_token FROM public.profiles WHERE id = auth.uid();
  -- If no token has been claimed yet, treat as active (avoid bootstrap lockout)
  IF current_token IS NULL THEN RETURN TRUE; END IF;
  RETURN current_token = _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_active_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_session(TEXT) TO authenticated;