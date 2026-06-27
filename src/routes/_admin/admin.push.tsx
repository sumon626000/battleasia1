import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase } from '@/integrations/supabase/client';
import { generateVapidKeys, setVapidSubject, sendAdminPush, getVapidPublic } from '@/lib/push.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export const Route = createFileRoute('/_admin/admin/push')({ component: AdminPush });

function AdminPush() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [userId, setUserId] = useState('');
  const [subCount, setSubCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const gen = useServerFn(generateVapidKeys);
  const setSubj = useServerFn(setVapidSubject);
  const send = useServerFn(sendAdminPush);
  const getPub = useServerFn(getVapidPublic);

  const refresh = async () => {
    const { publicKey } = await getPub();
    setPublicKey(publicKey);
    const { data: subj } = await supabase.from('website_settings').select('value').eq('key', 'vapid_subject').maybeSingle();
    if (subj?.value) setSubject(subj.value as string);
    const { count } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true });
    setSubCount(count || 0);
  };
  useEffect(() => { refresh(); }, []);

  return (
    <AdminShell>
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-gold">Push Notifications</h1>
          <p className="text-sm text-muted-foreground">Browser Web Push — VAPID self-managed, no third-party</p>
        </header>

        <section className="hud-panel space-y-4 p-5">
          <h2 className="font-display text-lg uppercase tracking-widest text-gold">VAPID Configuration</h2>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Public Key</label>
            <div className="mt-1 break-all rounded border border-gold/20 bg-background/50 p-2 font-mono text-xs">
              {publicKey || 'Not generated yet'}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                if (publicKey && !confirm('Regenerate? All existing subscriptions will stop working.')) return;
                setBusy(true);
                try { await gen(); toast.success('VAPID keys generated'); await refresh(); }
                catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
              }}
            >{publicKey ? 'Regenerate Keys' : 'Generate Keys'}</Button>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Email (VAPID subject)</label>
            <div className="mt-1 flex gap-2">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="admin@battleasia.app" />
              <Button variant="outline" disabled={busy || !subject} onClick={async () => {
                setBusy(true);
                try { await setSubj({ data: { email: subject } }); toast.success('Saved'); }
                catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
              }}>Save</Button>
            </div>
          </div>
        </section>

        <section className="hud-panel space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg uppercase tracking-widest text-gold">Send Push</h2>
            <span className="text-xs text-muted-foreground">{subCount} active subscriptions</span>
          </div>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          <Input placeholder="URL on click (e.g. /dashboard/matches)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Target user ID (blank = broadcast to all)" value={userId} onChange={(e) => setUserId(e.target.value)} />
          <Button
            disabled={busy || !title || !body || !publicKey}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await send({ data: { title, body, url, userId: userId || undefined } });
                toast.success(`Sent ${res.sent}/${res.total} (failed ${res.failed})`);
                setTitle(''); setBody('');
              } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
            }}
          >Send Push</Button>
          {!publicKey && <p className="text-xs text-destructive">Generate VAPID keys first.</p>}
        </section>
      </div>
    </AdminShell>
  );
}
