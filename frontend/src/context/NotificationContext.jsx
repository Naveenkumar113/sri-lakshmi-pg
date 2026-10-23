import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  isDesktopNotificationEnabled,
  setDesktopNotificationPreference,
  requestDesktopNotificationPermission,
  showIssueReportNotification,
  playNotificationChime,
} from '../services/desktopNotificationService';

const NotificationContext = createContext(null);

const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pg_auth_token') || localStorage.getItem('token');
};

const getBackendWsUrl = (authToken) => {
  let apiBase = api.defaults.baseURL || 'http://127.0.0.1:8000/api';
  if (typeof window !== 'undefined' && (apiBase.startsWith('/') || !apiBase.startsWith('http'))) {
    apiBase = `${window.location.origin}${apiBase}`;
  }
  const wsBase = apiBase.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
  return `${wsBase}/api/ws/notifications?token=${encodeURIComponent(authToken)}`;
};

const getBackendSseUrl = (authToken) => {
  let apiBase = api.defaults.baseURL || 'http://127.0.0.1:8000/api';
  if (typeof window !== 'undefined' && (apiBase.startsWith('/') || !apiBase.startsWith('http'))) {
    apiBase = `${window.location.origin}${apiBase}`;
  }
  const httpBase = apiBase.replace(/\/api\/?$/, '');
  return `${httpBase}/api/notifications/stream?token=${encodeURIComponent(authToken)}`;
};

export function NotificationProvider({ children }) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [permission, setPermission] = useState('default');
  const [desktopEnabled, setDesktopEnabled] = useState(false);

  const wsRef = useRef(null);
  const sseRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const prevUnreadIdsRef = useRef(null);

  // Fetch unread count and latest 25 notifications
  const refreshNotifications = useCallback(
    async (isPolling = false) => {
      const token = getAuthToken();
      if (!isAuthenticated || !token) return;

      try {
        const [countRes, listRes] = await Promise.all([
          api.get('/notifications/unread-count'),
          api.get('/notifications?limit=25'),
        ]);

        const count = countRes.data?.unread_count || 0;
        const rawList = Array.isArray(listRes.data) ? listRes.data : listRes.data?.items || [];

        setUnreadCount(count);
        setNotifications(rawList);

        // Detect newly arrived unread notifications during polling fallback
        const currentUnreadIds = new Set(rawList.filter((n) => !n.is_read).map((n) => n.id));

        if (prevUnreadIdsRef.current !== null && isPolling) {
          const newlyArrived = rawList.filter(
            (n) => !n.is_read && !prevUnreadIdsRef.current.has(n.id)
          );

          if (newlyArrived.length > 0) {
            playNotificationChime();

            // Trigger native notification for the most recent unread report
            newlyArrived.slice(0, 2).forEach((notif) => {
              showIssueReportNotification({
                id: notif.id,
                report_code: notif.report_id,
                resident_name: '',
                room_number: '',
                bed_number: '',
                issue_category: notif.title,
                description: notif.message,
                link: notif.link || `/admin/reports?report_id=${notif.report_id}`,
              });
            });

            // Dispatch global event so AdminReports auto-refreshes
            window.dispatchEvent(
              new CustomEvent('pg-new-report', {
                detail: { count, notifications: newlyArrived },
              })
            );
          }
        }

        prevUnreadIdsRef.current = currentUnreadIds;
      } catch (err) {
        console.warn('Failed to refresh notifications:', err);
      }
    },
    [isAuthenticated]
  );

  // Check initial desktop notification permissions
  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
      setDesktopEnabled(isDesktopNotificationEnabled());
    }
  }, []);

  // Sync on login/logout
  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications(false);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      prevUnreadIdsRef.current = null;
    }
  }, [isAuthenticated, refreshNotifications]);

  // Real-Time Delivery Pipeline (WebSockets + SSE Fallback + Resilient Polling)
  useEffect(() => {
    const token = getAuthToken();
    if (!isAuthenticated || !isAdmin || !token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      setIsRealtimeConnected(false);
      return;
    }

    let isSubscribed = true;

    const connectWebSocket = () => {
      try {
        const wsUrl = getBackendWsUrl(token);
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          if (!isSubscribed) return;
          setIsRealtimeConnected(true);
          console.log('✅ Real-time Notification WebSocket connected');
        };

        socket.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'NEW_ISSUE_REPORT') {
              const notif = data.notification;
              const issue = data.issue;

              // Immediately prepend into local state
              setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
              setUnreadCount((prev) => prev + 1);

              if (prevUnreadIdsRef.current) {
                prevUnreadIdsRef.current.add(notif.id);
              }

              // Play pleasant audio chime
              playNotificationChime();

              // Trigger native desktop or mobile notification
              showIssueReportNotification({
                id: notif.id,
                report_code: issue?.report_code,
                resident_name: issue?.resident_name,
                room_number: issue?.room_number,
                bed_number: issue?.bed_number,
                issue_category: issue?.issue_category,
                description: issue?.description,
                link: notif.link || `/admin/reports?report_id=${notif.report_id}`,
              });

              // Dispatch event so AdminReports table auto-refreshes
              window.dispatchEvent(
                new CustomEvent('pg-new-report', {
                  detail: { issue, notification: notif },
                })
              );
            }
          } catch (err) {
            console.warn('Failed to parse WebSocket message:', err);
          }
        };

        socket.onerror = (err) => {
          console.warn('WebSocket error, falling back to SSE stream:', err);
          setIsRealtimeConnected(false);
          startSSEFallback();
        };

        socket.onclose = () => {
          if (!isSubscribed) return;
          setIsRealtimeConnected(false);
          // Auto reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        };
      } catch (e) {
        console.warn('Could not establish WebSocket, trying SSE fallback:', e);
        startSSEFallback();
      }
    };

    const startSSEFallback = () => {
      if (sseRef.current || !isSubscribed) return;
      try {
        const sseUrl = getBackendSseUrl(token);
        const eventSource = new EventSource(sseUrl);
        sseRef.current = eventSource;

        eventSource.onopen = () => {
          if (isSubscribed) setIsRealtimeConnected(true);
        };

        eventSource.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_ISSUE_REPORT') {
              const notif = data.notification;
              const issue = data.issue;
              setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
              setUnreadCount((prev) => prev + 1);

              playNotificationChime();

              showIssueReportNotification({
                id: notif.id,
                report_code: issue?.report_code,
                resident_name: issue?.resident_name,
                room_number: issue?.room_number,
                bed_number: issue?.bed_number,
                issue_category: issue?.issue_category,
                description: issue?.description,
                link: notif.link,
              });

              window.dispatchEvent(
                new CustomEvent('pg-new-report', { detail: { issue, notification: notif } })
              );
            }
          } catch (e) {
            console.warn('SSE parse error:', e);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          sseRef.current = null;
        };
      } catch (e) {
        console.warn('SSE fallback error:', e);
      }
    };

    connectWebSocket();

    // High-resilience proactive polling interval:
    // Polls every 6 seconds when tab is active, 15 seconds when backgrounded
    let pollIntervalMs = document.hidden ? 15000 : 6000;
    let pollTimer = setInterval(() => {
      refreshNotifications(true);
    }, pollIntervalMs);

    const handleVisibilityChange = () => {
      clearInterval(pollTimer);
      pollIntervalMs = document.hidden ? 15000 : 6000;
      pollTimer = setInterval(() => {
        refreshNotifications(true);
      }, pollIntervalMs);

      // Instantly refresh when returning to tab
      if (!document.hidden) {
        refreshNotifications(true);
      }
    };

    const handleWindowFocus = () => {
      refreshNotifications(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isSubscribed = false;
      if (wsRef.current) wsRef.current.close();
      if (sseRef.current) sseRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isAuthenticated, isAdmin, refreshNotifications]);

  // Request browser permission for native alerts and Web Push
  const enableDesktopNotifications = async () => {
    const res = await requestDesktopNotificationPermission();
    setPermission(getNotificationPermission());
    setDesktopEnabled(isDesktopNotificationEnabled());
    return res;
  };

  const toggleDesktopNotifications = (enabled) => {
    setDesktopNotificationPreference(enabled);
    setDesktopEnabled(enabled);
    if (enabled && permission !== 'granted') {
      enableDesktopNotifications();
    }
  };

  // Mark single notification read
  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  // Mark all notifications read
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        isRealtimeConnected,
        permission,
        desktopEnabled,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        enableDesktopNotifications,
        toggleDesktopNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
