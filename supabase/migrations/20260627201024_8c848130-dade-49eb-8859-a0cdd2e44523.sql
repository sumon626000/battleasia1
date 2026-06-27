
CREATE TABLE public.social_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);
CREATE INDEX idx_stories_expires ON public.social_stories(expires_at);
CREATE INDEX idx_stories_user ON public.social_stories(user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.social_stories TO authenticated;
GRANT SELECT ON public.social_stories TO anon;
GRANT ALL ON public.social_stories TO service_role;

ALTER TABLE public.social_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active stories" ON public.social_stories
  FOR SELECT USING (expires_at > now());
CREATE POLICY "Users create own stories" ON public.social_stories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own stories" ON public.social_stories
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
