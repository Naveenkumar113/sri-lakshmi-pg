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
  subscribeAdminToWebPush,
} from '../services/desktopNotificationService';

const NotificationContext = createContext(null);

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
  const token = localStorage.getItem('token');

  // Fetch initial unread count and latest 20 notifications
  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [countRes, listRes] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/notifications?limit=25'),
      ]);
      setUnreadCount(countRes.data?.unread_count || 0);
      setNotifications(Array.isArray(listRes.data) ? listRes.data : listRes.data?.items || []);
    } catch (err) {
      console.warn('Failed to refresh notifications:', err);
    }
  }, [isAuthenticated]);

  // Initial permission check
  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
      setDesktopEnabled(isDesktopNotificationEnabled());
    }
  }, []);

  // Sync notifications on authentication or role change
  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, refreshNotifications]);

  // Real-time WebSocket connection for administrators
  useEffect(() => {
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
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const wsUrl = `${protocol}//${host}/api/ws/notifications?token=${encodeURIComponent(token)}`;

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

              // Trigger native browser notification
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

              // Dispatch global event so AdminReports table auto-refreshes
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
          console.warn('WebSocket error, falling back to SSE:', err);
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
        console.warn('Could not establish WebSocket, using SSE fallback:', e);
        startSSEFallback();
      }
    };

    const startSSEFallback = () => {
      if (sseRef.current || !isSubscribed) return;
      try {
        const sseUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
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
              window.dispatchEvent(new CustomEvent('pg-new-report', { detail: { issue, notification: notif } }));
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

    // 30-second poll backup to keep unread counter synchronized
    const syncInterval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => {
      isSubscribed = false;
      if (wsRef.current) wsRef.current.close();
      if (sseRef.current) sseRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(syncInterval);
    };
  }, [isAuthenticated, isAdmin, token, refreshNotifications]);

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
