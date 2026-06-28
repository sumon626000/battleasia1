-- Settings (singleton row, id = 1)
CREATE TABLE public.chatbot_settings (
  id INT PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  system_prompt TEXT NOT NULL DEFAULT 'You are the friendly support assistant for Battle Asia, a gaming tournament platform. Help users with questions about tournaments, matches, wallet, deposits/withdrawals, account, and games. Be concise and helpful. If you do not know, advise the user to contact human support.',
  welcome_message TEXT NOT NULL DEFAULT 'Hi! 👋 I am the Battle Asia support assistant. How can I help you today?',
  bubble_title TEXT NOT NULL DEFAULT 'Support Assistant',
  rate_limit_per_hour INT NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chatbot_settings_singleton CHECK (id = 1)
);

GRANT SELECT ON public.chatbot_settings TO anon, authenticated;
GRANT ALL ON public.chatbot_settings TO service_role;

ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chatbot settings"
  ON public.chatbot_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage chatbot settings"
  ON public.chatbot_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.chatbot_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Knowledge base
CREATE TABLE public.chatbot_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.chatbot_knowledge TO anon, authenticated;
GRANT ALL ON public.chatbot_knowledge TO service_role;

ALTER TABLE public.chatbot_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read enabled knowledge"
  ON public.chatbot_knowledge FOR SELECT
  USING (enabled = true OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage chatbot knowledge"
  ON public.chatbot_knowledge FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER chatbot_settings_updated_at
  BEFORE UPDATE ON public.chatbot_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER chatbot_knowledge_updated_at
  BEFORE UPDATE ON public.chatbot_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();