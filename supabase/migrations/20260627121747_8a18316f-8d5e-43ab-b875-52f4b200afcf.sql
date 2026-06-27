
-- LOGIN HISTORY
CREATE TABLE public.login_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  country_code TEXT,
  country_name TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  device TEXT,
  platform TEXT,
  user_agent TEXT,
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_history_user ON public.login_history(user_id, login_at DESC);
CREATE INDEX idx_login_history_at ON public.login_history(login_at DESC);

GRANT SELECT, INSERT ON public.login_history TO authenticated;
GRANT USAGE ON SEQUENCE public.login_history_id_seq TO authenticated;
GRANT ALL ON public.login_history TO service_role;
GRANT ALL ON SEQUENCE public.login_history_id_seq TO service_role;

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own login" ON public.login_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users view own login" ON public.login_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins view all login" ON public.login_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ONLINE SESSIONS
CREATE TABLE public.online_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  country_code TEXT,
  browser TEXT,
  os TEXT,
  device TEXT,
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_online_sessions_user ON public.online_sessions(user_id);
CREATE INDEX idx_online_sessions_last_seen ON public.online_sessions(last_seen_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.online_sessions TO authenticated;
GRANT USAGE ON SEQUENCE public.online_sessions_id_seq TO authenticated;
GRANT ALL ON public.online_sessions TO service_role;
GRANT ALL ON SEQUENCE public.online_sessions_id_seq TO service_role;

ALTER TABLE public.online_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own sessions" ON public.online_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins view sessions" ON public.online_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete sessions" ON public.online_sessions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- BACKUP LOGS
CREATE TABLE public.backup_logs (
  id BIGSERIAL PRIMARY KEY,
  backup_type TEXT NOT NULL DEFAULT 'manual',
  file_path TEXT,
  file_size_bytes BIGINT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  initiated_by_admin_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_logs TO authenticated;
GRANT USAGE ON SEQUENCE public.backup_logs_id_seq TO authenticated;
GRANT ALL ON public.backup_logs TO service_role;
GRANT ALL ON SEQUENCE public.backup_logs_id_seq TO service_role;

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage backups" ON public.backup_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ADMIN FORCE LOGOUT RPC
CREATE OR REPLACE FUNCTION public.admin_force_logout_user(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM public.online_sessions WHERE user_id = _user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO public.admin_action_logs (admin_id, admin_name, module, action, target_type, target_id)
  VALUES (
    auth.uid(),
    COALESCE((SELECT username FROM public.profiles WHERE user_id = auth.uid()), 'admin'),
    'security',
    'force_logout_user',
    'user',
    _user_id::TEXT
  );
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_force_logout_all()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM public.online_sessions;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  INSERT INTO public.admin_action_logs (admin_id, admin_name, module, action)
  VALUES (
    auth.uid(),
    COALESCE((SELECT username FROM public.profiles WHERE user_id = auth.uid()), 'admin'),
    'security',
    'force_logout_all'
  );
  RETURN deleted_count;
END;
$$;

-- RECORD LOGIN HELPER (records both history + session)
CREATE OR REPLACE FUNCTION public.record_login_event(
  _ip TEXT,
  _country_code TEXT,
  _country_name TEXT,
  _browser TEXT,
  _browser_version TEXT,
  _os TEXT,
  _device TEXT,
  _platform TEXT,
  _user_agent TEXT,
  _session_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.login_history (user_id, ip_address, country_code, country_name, browser, browser_version, os, device, platform, user_agent)
  VALUES (auth.uid(), _ip, _country_code, _country_name, _browser, _browser_version, _os, _device, _platform, _user_agent);

  INSERT INTO public.online_sessions (user_id, session_token, ip_address, country_code, browser, os, device, user_agent, last_seen_at, expires_at)
  VALUES (auth.uid(), _session_token, _ip, _country_code, _browser, _os, _device, _user_agent, now(), now() + INTERVAL '30 minutes')
  ON CONFLICT (session_token) DO UPDATE
    SET last_seen_at = now(), expires_at = now() + INTERVAL '30 minutes';
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_session(_session_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.online_sessions
     SET last_seen_at = now(), expires_at = now() + INTERVAL '30 minutes'
   WHERE session_token = _session_token AND user_id = auth.uid();
END;
$$;
