import { api } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
}

export function isPushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

export function getPushPermission(): NotificationPermission {
    if (!isPushSupported()) return 'denied';
    return Notification.permission;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!isPushSupported()) return null;
    return (await navigator.serviceWorker.ready) ?? null;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
    const reg = await getRegistration();
    if (!reg) return null;
    return reg.pushManager.getSubscription();
}

export async function subscribeToPush(token: string): Promise<PushSubscription | null> {
    if (!isPushSupported()) throw new Error('Push no soportado en este navegador');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permiso denegado');

    const reg = await getRegistration();
    if (!reg) throw new Error('Service worker no disponible');

    const { key } = await api<{ key: string }>('/push/public-key', { token });
    const applicationServerKey = urlBase64ToUint8Array(key);

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
        await api('/push/subscribe', {
            method: 'POST',
            token,
            body: JSON.stringify(existing.toJSON()),
        });
        return existing;
    }

    const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
    });

    await api('/push/subscribe', {
        method: 'POST',
        token,
        body: JSON.stringify(sub.toJSON()),
    });

    return sub;
}

export async function unsubscribeFromPush(token: string): Promise<void> {
    const sub = await getCurrentSubscription();
    if (!sub) return;
    try {
        await api('/push/subscribe', {
            method: 'DELETE',
            token,
            body: JSON.stringify({ endpoint: sub.endpoint }),
        });
    } finally {
        await sub.unsubscribe();
    }
}
