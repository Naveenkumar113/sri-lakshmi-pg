// Utility for registering service worker and managing Windows desktop / mobile browser notifications
// Sri Lakshmi Srinivasa Gents PG Management
import api from './api';

const DESKTOP_NOTIF_PREF_KEY = 'pg_desktop_notifications_enabled';
const LAST_NOTIF_ID_KEY = 'pg_last_seen_desktop_notification_id';

export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
};

export const isDesktopNotificationEnabled = () => {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  const pref = localStorage.getItem(DESKTOP_NOTIF_PREF_KEY);
  return pref === null ? true : pref === 'true';
};

export const setDesktopNotificationPreference = (enabled) => {
  localStorage.setItem(DESKTOP_NOTIF_PREF_KEY, enabled ? 'true' : 'false');
};

export const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const registerServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return reg;
    } catch (err) {
      console.warn('ServiceWorker registration failed:', err);
    }
  }
  return null;
};

export const subscribeAdminToWebPush = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;

    // Fetch VAPID public key
    const res = await api.get('/notifications/vapid-public-key');
    const vapidKey = res.data?.publicKey;
    if (!vapidKey) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const subJson = sub.toJSON();
    if (subJson && subJson.endpoint && subJson.keys) {
      await api.post('/notifications/push-subscribe', {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        user_agent: navigator.userAgent,
      });
      return true;
    }
  } catch (err) {
    console.warn('Web Push subscription error:', err);
  }
  return false;
};

export const requestDesktopNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return { status: 'unsupported', message: 'Desktop notifications are not supported by this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setDesktopNotificationPreference(true);
      await registerServiceWorker();
      await subscribeAdminToWebPush();
      return { status: 'granted', message: 'Desktop notifications enabled successfully!' };
    } else if (permission === 'denied') {
      setDesktopNotificationPreference(false);
      return {
        status: 'denied',
        message:
          'Notification permission was denied. To enable notifications, click the lock/settings icon in your browser address bar and allow notifications.',
      };
    } else {
      return { status: 'default', message: 'Notification permission was dismissed.' };
    }
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return { status: 'error', message: err.message };
  }
};

/**
 * Gentle two-tone notification audio chime
 */
export const playNotificationChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Autoplay restrictions or muted context
  }
};

/**
 * Triggers a real native desktop/mobile notification using ServiceWorkerRegistration if available,
 * or standard Notification API as fallback.
 * Formatted like smartphone reference notification card.
 */
export const showWindowsDesktopNotification = async ({
  id,
  title,
  message,
  link = '/',
  tag,
  icon = '/favicon.svg',
  onClick,
}) => {
  if (!isDesktopNotificationEnabled()) return null;

  const notifTag = tag || (id ? `pg-notif-${id}` : 'pg-notification');
  const fullTitle = title || '🔔 Sri Lakshmi PG — New Issue Report';
  const bodyText = message || '';

  // 1. Try ServiceWorkerRegistration (best for background/Windows Action Center/Mobile PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(fullTitle, {
          body: bodyText,
          icon,
          badge: icon,
          tag: notifTag,
          renotify: true,
          requireInteraction: false,
          data: { id, link, url: link },
          timestamp: Date.now(),
        });
        return true;
      }
    } catch (err) {
      console.warn('ServiceWorker showNotification failed, trying standard Notification:', err);
    }
  }

  // 2. Fallback to standard window.Notification
  try {
    const n = new Notification(fullTitle, {
      body: bodyText,
      icon,
      tag: notifTag,
      renotify: true,
    });

    n.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (onClick) {
        onClick();
      } else if (link) {
        window.location.href = link;
      }
      n.close();
    };

    return true;
  } catch (err) {
    console.error('Failed to trigger window.Notification:', err);
    return false;
  }
};

/**
 * Triggers issue report notification formatted specifically to match reference:
 * Title: 🔔 Sri Lakshmi PG — New Issue Report
 * Message: Room S-2, Bed B1 — Tap is not working
 * Additional details: Resident name, category, time
 */
export const showIssueReportNotification = async ({
  id,
  report_code,
  resident_name,
  room_number,
  bed_number,
  issue_category,
  description,
  link,
}) => {
  const roomBed = room_number && bed_number
    ? `Room ${room_number}, Bed ${bed_number}`
    : room_number
    ? `Room ${room_number}`
    : 'Resident Report';

  const descSnippet = description ? (description.length > 55 ? description.substring(0, 55) + '...' : description) : issue_category;
  const residentInfo = resident_name ? `\nResident: ${resident_name}` : '';
  const message = `${roomBed} — ${descSnippet}${residentInfo}`;

  playNotificationChime();

  return await showWindowsDesktopNotification({
    id,
    title: '🔔 Sri Lakshmi PG — New Issue Report',
    message,
    link: link || (id ? `/admin/reports?report_id=${id}` : '/admin/reports'),
    tag: `pg-issue-${id || report_code || Date.now()}`,
  });
};

/**
 * Checks for new unread notifications and triggers desktop toasts for unseen ones
 */
export const processIncomingNotificationsForDesktop = (notifications = []) => {
  if (!isDesktopNotificationEnabled()) return;
  if (!Array.isArray(notifications) || notifications.length === 0) return;

  const lastSeenId = localStorage.getItem(LAST_NOTIF_ID_KEY);
  const unreadList = notifications.filter((n) => !n.is_read);

  if (unreadList.length === 0) return;

  if (!lastSeenId) {
    localStorage.setItem(LAST_NOTIF_ID_KEY, unreadList[0].id);
    return;
  }

  const newItems = [];
  for (const n of unreadList) {
    if (n.id === lastSeenId) break;
    newItems.push(n);
  }

  if (newItems.length > 0) {
    newItems.slice(0, 3).forEach((n) => {
      showWindowsDesktopNotification({
        id: n.id,
        title: n.title,
        message: n.message,
        link: n.link || '/admin/notifications',
        tag: `pg-notif-${n.id}`,
      });
    });

    localStorage.setItem(LAST_NOTIF_ID_KEY, newItems[0].id);
  }
};
