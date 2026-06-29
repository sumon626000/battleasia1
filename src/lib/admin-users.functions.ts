import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Admin: update a user's auth email and/or password
export const adminUpdateUserAuth = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; email?: string; password?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    const { data: isSuper } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'super_admin',
    });
    if (!isAdmin && !isSuper) throw new Error('Forbidden');

    const patch: { email?: string; password?: string } = {};
    if (data.email && data.email.trim()) patch.email = data.email.trim();
    if (data.password && data.password.length >= 6) patch.password = data.password;
    if (!Object.keys(patch).length) return { ok: true };

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, patch);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
