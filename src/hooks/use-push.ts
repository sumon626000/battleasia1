import { useEffect, useState, useCallback } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getVapidPublic, savePushSubscription, removePushSubscription } from '@/lib/push.functions';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushSubscription() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const getPub = useServerFn(getVapidPublic);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.getRegistration('/sw-push.js').then(async (reg) => {
      const r = reg || (await navigator.serviceWorker.register('/sw-push.js'));
      const sub = await r.pushManager.getSubscription();
      setSubscribed(!!sub);
    }).catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;
      const { publicKey } = await getPub();
      if (!publicKey) throw new Error('Push not configured by admin yet');
      const reg = (await navigator.serviceWorker.getRegistration('/sw-push.js')) || (await navigator.serviceWorker.register('/sw-push.js'));
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as any;
      await save({ data: { endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, userAgent: navigator.userAgent } });
      setSubscribed(true);
      return true;
    } finally {
      setLoading(false);
    }
  }, [getPub, save]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await remove({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [remove]);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
