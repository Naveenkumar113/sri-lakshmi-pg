// Utility for registering service worker and managing Windows desktop / browser notifications
// Sri Lakshmi Srinivasa Gents PG Management

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

export const requestDesktopNotificationPermission = async () => {
  if (!isNotificationSupported()) {
    return { status: 'unsupported', message: 'Desktop notifications are not supported by this browser.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setDesktopNotificationPreference(true);
      await registerServiceWorker();
      return { status: 'granted', message: 'Desktop notifications enabled successfully!' };
    } else if (permission === 'denied') {
      setDesktopNotificationPreference(false);
      return {
        status: 'denied',
        message:
          'Notification permission was denied. To enable Windows desktop notifications, click the lock/settings icon in your browser address bar and allow notifications.',
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
 * Triggers a real Windows desktop notification using ServiceWorkerRegistration if available,
 * or standard Notification API as fallback.
 * Automatically appears in the Windows 10/11 bottom-right notification toast and Action Center.
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
  const fullTitle = title || 'Sri Lakshmi Srinivasa Gents PG';
  const bodyText = message || '';

  // 1. Try ServiceWorkerRegistration (Best support for Windows Action Center)
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
 * Checks for new unread notifications and triggers desktop toasts for unseen ones
 */
export const processIncomingNotificationsForDesktop = (notifications = []) => {
  if (!isDesktopNotificationEnabled()) return;
  if (!Array.isArray(notifications) || notifications.length === 0) return;

  const lastSeenId = localStorage.getItem(LAST_NOTIF_ID_KEY);
  const unreadList = notifications.filter((n) => !n.is_read);

  if (unreadList.length === 0) return;

  // If this is the very first sync, record the latest notification ID to avoid alert spamming
  if (!lastSeenId) {
    localStorage.setItem(LAST_NOTIF_ID_KEY, unreadList[0].id);
    return;
  }

  // Find newly arrived unread notifications that were created after the stored lastSeenId
  const newItems = [];
  for (const n of unreadList) {
    if (n.id === lastSeenId) break;
    newItems.push(n);
  }

  if (newItems.length > 0) {
    // Show notification for the newest item(s) (cap at 3 to prevent notification storm)
    newItems.slice(0, 3).forEach((n) => {
      showWindowsDesktopNotification({
        id: n.id,
        title: n.title,
        message: n.message,
        link: n.link || '/notifications',
        tag: `pg-notif-${n.id}`,
      });
    });

    // Update last seen
    localStorage.setItem(LAST_NOTIF_ID_KEY, newItems[0].id);
  }
};
