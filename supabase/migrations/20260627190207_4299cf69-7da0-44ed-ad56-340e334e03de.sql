ALTER TABLE public.admin_action_logs ALTER COLUMN admin_name DROP NOT NULL;
ALTER TABLE public.admin_action_logs ALTER COLUMN admin_name SET DEFAULT 'admin';