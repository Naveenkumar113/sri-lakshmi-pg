import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

export default function AdminNotificationBell() {
  const {
    notifications,
    unreadCount,
    isRealtimeConnected,
    desktopEnabled,
    permission,
    enableDesktopNotifications,
    toggleDesktopNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format relative timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffSecs = Math.floor((now - date) / 1000);
      if (diffSecs < 45) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    } else if (notif.report_id) {
      navigate(`/admin/reports?report_id=${notif.report_id}`);
    } else {
      navigate('/admin/notifications');
    }
  };

  const recentNotifications = notifications.slice(0, 8);

  return (
    <div className="position-relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-sm btn-light border position-relative d-flex align-items-center justify-content-center p-0 rounded-2 shadow-xs transition-all"
        style={{
          width: '38px',
          height: '38px',
          backgroundColor: isOpen ? '#FFF7ED' : '#FFFFFF',
          borderColor: isOpen ? '#F97316' : '#E2E8F0',
        }}
        title="Admin Notification Center"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <i
          className={`bi ${unreadCount > 0 ? 'bi-bell-fill text-warning' : 'bi-bell text-secondary'} fs-5`}
          style={{ color: unreadCount > 0 ? '#EA580C' : '#64748B' }}
        ></i>

        {/* Live Unread Badge */}
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white"
            style={{
              fontSize: '0.68rem',
              padding: '0.22em 0.45em',
              animation: 'pulse 1.8s infinite',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
            <span className="visually-hidden">unread notifications</span>
          </span>
        )}

        {/* Realtime Live Green Indicator Dot */}
        <span
          className="position-absolute bottom-0 end-0 rounded-circle border border-white"
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: isRealtimeConnected ? '#10B981' : '#94A3B8',
            transform: 'translate(-2px, -2px)',
          }}
          title={isRealtimeConnected ? 'Real-time WebSocket Live' : 'Reconnecting...'}
        />
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div
          className="admin-notification-panel position-absolute end-0 mt-2 bg-white rounded-3 shadow-xl border overflow-hidden"
          style={{
            width: 'min(92vw, 420px)',
            maxWidth: '420px',
            zIndex: 1060,
            border: '1px solid rgba(226, 232, 240, 0.9)',
            animation: 'fadeInSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Header */}
          <div className="p-3 bg-light border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '0.92rem' }}>
                Notifications
              </h6>
              {unreadCount > 0 ? (
                <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                  {unreadCount} new
                </span>
              ) : (
                <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-2 py-0.5" style={{ fontSize: '0.72rem' }}>
                  Up to date
                </span>
              )}

              {/* Real-time Indicator Pill */}
              <span
                className={`d-inline-flex align-items-center gap-1 px-1.5 py-0.5 rounded-pill ${
                  isRealtimeConnected ? 'bg-success bg-opacity-10 text-success' : 'bg-secondary bg-opacity-10 text-secondary'
                }`}
                style={{ fontSize: '0.65rem', fontWeight: 600 }}
              >
                <span
                  className="rounded-circle"
                  style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: isRealtimeConnected ? '#10B981' : '#94A3B8',
                  }}
                />
                {isRealtimeConnected ? 'Live' : 'Syncing'}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="btn btn-sm btn-link text-decoration-none text-muted p-0 small hover-text-primary"
                  style={{ fontSize: '0.75rem' }}
                  title="Mark all as read"
                >
                  <i className="bi bi-check2-all me-1 text-primary"></i>Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Quick Native Notification Toggle Bar */}
          <div className="px-3 py-2 bg-warning bg-opacity-10 border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <i className={`bi bi-${desktopEnabled ? 'bell-fill text-warning' : 'bell text-secondary'} fs-6`}></i>
              <div>
                <div className="fw-semibold text-dark" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                  Desktop & Mobile Alerts
                </div>
                <div className="text-muted" style={{ fontSize: '0.66rem' }}>
                  {permission === 'granted'
                    ? desktopEnabled
                      ? 'Instant native toasts active'
                      : 'Alerts paused'
                    : 'Enable native notifications'}
                </div>
              </div>
            </div>

            {permission !== 'granted' ? (
              <button
                type="button"
                onClick={enableDesktopNotifications}
                className="btn btn-sm btn-warning text-dark py-0.5 px-2 fw-semibold"
                style={{ fontSize: '0.72rem' }}
              >
                Enable
              </button>
            ) : (
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={desktopEnabled}
                  onChange={(e) => toggleDesktopNotifications(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
              </div>
            )}
          </div>

          {/* Notifications Scroll List */}
          <div className="overflow-y-auto" style={{ maxHeight: '360px', scrollbarWidth: 'thin' }}>
            {recentNotifications.length === 0 ? (
              <div className="text-center py-5 px-3">
                <div
                  className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center text-muted mb-2"
                  style={{ width: '48px', height: '48px' }}
                >
                  <i className="bi bi-bell-slash fs-4"></i>
                </div>
                <h6 className="fw-semibold text-dark mb-1" style={{ fontSize: '0.85rem' }}>
                  No notifications yet
                </h6>
                <p className="text-muted small mb-0" style={{ fontSize: '0.75rem' }}>
                  When residents submit issues or book rooms, you'll be alerted immediately here.
                </p>
              </div>
            ) : (
              recentNotifications.map((notif) => {
                const isReport = notif.notification_type === 'REPORT';
                return (
                  <div
                    key={notif.id}
                    className={`p-3 border-bottom transition-all position-relative ${
                      !notif.is_read ? 'bg-orange-50 bg-opacity-40' : 'bg-white hover-bg-light'
                    }`}
                    style={{
                      backgroundColor: !notif.is_read ? 'rgba(254, 243, 199, 0.35)' : undefined,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="d-flex align-items-start gap-2.5">
                      {/* Icon */}
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 text-white ${
                          isReport
                            ? 'bg-danger shadow-xs'
                            : notif.notification_type === 'BOOKING'
                            ? 'bg-warning text-dark'
                            : notif.notification_type === 'VISIT'
                            ? 'bg-primary'
                            : 'bg-info'
                        }`}
                        style={{ width: '32px', height: '32px' }}
                      >
                        <i
                          className={`bi bi-${
                            isReport
                              ? 'exclamation-triangle-fill'
                              : notif.notification_type === 'BOOKING'
                              ? 'door-open-fill'
                              : notif.notification_type === 'VISIT'
                              ? 'calendar2-check-fill'
                              : 'bell-fill'
                          }`}
                          style={{ fontSize: '0.85rem' }}
                        ></i>
                      </div>

                      {/* Content */}
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
                          <span
                            className="fw-bold text-dark text-truncate"
                            style={{ fontSize: '0.82rem' }}
                            title={notif.title}
                          >
                            {notif.title}
                          </span>
                          <span className="text-muted flex-shrink-0" style={{ fontSize: '0.68rem' }}>
                            {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>

                        <p
                          className="text-secondary mb-1.5 lh-sm text-truncate-2"
                          style={{
                            fontSize: '0.76rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {notif.message}
                        </p>

                        <div className="d-flex align-items-center justify-content-between pt-1">
                          <span
                            className="text-primary fw-semibold d-inline-flex align-items-center gap-1"
                            style={{ fontSize: '0.72rem' }}
                          >
                            Open Details <i className="bi bi-arrow-right"></i>
                          </span>

                          {!notif.is_read && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notif.id);
                              }}
                              className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
                              title="Mark as read"
                              style={{ fontSize: '0.72rem' }}
                            >
                              <i className="bi bi-check2 text-primary fs-6"></i>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Unread dot indicator */}
                      {!notif.is_read && (
                        <div
                          className="rounded-circle flex-shrink-0 mt-1"
                          style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#EA580C',
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-light border-top text-center">
            <Link
              to="/admin/notifications"
              onClick={() => setIsOpen(false)}
              className="btn btn-sm btn-link text-decoration-none fw-semibold text-primary w-100 py-1"
              style={{ fontSize: '0.8rem' }}
            >
              View All Notifications & History <i className="bi bi-arrow-right"></i>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
