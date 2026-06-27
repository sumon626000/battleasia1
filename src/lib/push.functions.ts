import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import webpush from 'web-push';

// Get VAPID public key (public — anyone can read to subscribe)
export const getVapidPublic = createServerFn({ method: 'GET' }).handler(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb.from('website_settings').select('value').eq('key', 'vapid_public_key').maybeSingle();
  return { publicKey: (data?.value as string) || null };
});

// Admin: generate new VAPID keypair, store both
export const generateVapidKeys = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const keys = webpush.generateVAPIDKeys();
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('website_settings').upsert([
      { key: 'vapid_public_key', value: keys.publicKey },
      { key: 'vapid_private_key', value: keys.privateKey },
    ], { onConflict: 'key' });
    return { publicKey: keys.publicKey };
  });

// Admin: set contact email for VAPID subject
export const setVapidSubject = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('website_settings').upsert({ key: 'vapid_subject', value: data.email }, { onConflict: 'key' });
    return { ok: true };
  });

// User: save subscription
export const savePushSubscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('push_subscriptions').upsert({
      user_id: context.userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      user_agent: data.userAgent ?? null,
    }, { onConflict: 'endpoint' });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase.from('push_subscriptions').delete().eq('endpoint', data.endpoint).eq('user_id', context.userId);
    return { ok: true };
  });

// Admin: send push to all or a single user
export const sendAdminPush = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; body: string; url?: string; userId?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const settings = await supabaseAdmin.from('website_settings').select('key,value').in('key', ['vapid_public_key', 'vapid_private_key', 'vapid_subject']);
    const map = new Map((settings.data ?? []).map((r) => [r.key, r.value as string]));
    const pub = map.get('vapid_public_key');
    const priv = map.get('vapid_private_key');
    const subj = map.get('vapid_subject') || 'mailto:admin@battleasia.app';
    if (!pub || !priv) throw new Error('VAPID keys not configured');
    webpush.setVapidDetails(subj.startsWith('mailto:') ? subj : `mailto:${subj}`, pub, priv);

    let q = supabaseAdmin.from('push_subscriptions').select('id,endpoint,p256dh,auth');
    if (data.userId) q = q.eq('user_id', data.userId);
    const { data: subs } = await q;
    const payload = JSON.stringify({ title: data.title, body: data.body, url: data.url || '/' });
    let sent = 0, failed = 0;
    const stale: string[] = [];
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        failed++;
        if (e?.statusCode === 404 || e?.statusCode === 410) stale.push(s.id);
      }
    }));
    if (stale.length) await supabaseAdmin.from('push_subscriptions').delete().in('id', stale);
    return { sent, failed, total: subs?.length ?? 0 };
  });
