import React, { useState, useEffect } from 'react';
import {
  isNotificationSupported,
  getNotificationPermission,
  isDesktopNotificationEnabled,
  setDesktopNotificationPreference,
  requestDesktopNotificationPermission,
  showWindowsDesktopNotification,
} from '../services/desktopNotificationService';

export default function NotificationPermissionBanner() {
  const [permission, setPermission] = useState('default');
  const [enabled, setEnabled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    if (!isNotificationSupported()) return;
    const perm = getNotificationPermission();
    setPermission(perm);
    setEnabled(isDesktopNotificationEnabled());
    const isDismissed = sessionStorage.getItem('pg_desktop_notif_banner_dismissed') === 'true';
    setDismissed(isDismissed);
  }, []);

  if (!isNotificationSupported()) {
    return null;
  }

  const handleEnable = async () => {
    setAlertMsg(null);
    const res = await requestDesktopNotificationPermission();
    const newPerm = getNotificationPermission();
    setPermission(newPerm);
    setEnabled(isDesktopNotificationEnabled());

    if (res.status === 'granted') {
      setAlertMsg({ type: 'success', text: 'Windows desktop notifications are now active!' });
      // Send welcoming Windows notification sample
      showWindowsDesktopNotification({
        title: 'Sri Lakshmi Srinivasa Gents PG',
        message: 'Windows desktop notifications enabled! You will now receive instant alerts here.',
        link: '/notifications',
      });
    } else if (res.status === 'denied') {
      setAlertMsg({
        type: 'warning',
        text: 'Notification permission is blocked. Click the lock icon in your browser address bar to allow notifications.',
      });
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pg_desktop_notif_banner_dismissed', 'true');
  };

  const handleToggle = (checked) => {
    setDesktopNotificationPreference(checked);
    setEnabled(checked);
    if (checked && permission !== 'granted') {
      handleEnable();
    }
  };

  const handleTestNotification = () => {
    setTestSent(true);
    showWindowsDesktopNotification({
      title: 'Sri Lakshmi Srinivasa Gents PG — Test Alert',
      message: 'Windows desktop notification working! Check bottom-right toast and Windows Action Center.',
      link: '/notifications',
    });
    setTimeout(() => setTestSent(false), 3000);
  };

  // If permission is already granted, show minimal control / settings toggle
  if (permission === 'granted') {
    return (
      <div className="bg-light p-3 rounded-4 border mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-white"
            style={{ width: '38px', height: '38px', backgroundColor: enabled ? '#10B981' : '#6B7280' }}
          >
            <i className={`bi bi-${enabled ? 'bell-fill' : 'bell-slash'} fs-6`}></i>
          </div>
          <div>
            <div className="fw-bold text-dark small mb-0">
              Windows Desktop Notifications: {enabled ? 'Enabled' : 'Paused'}
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              Real-time alerts appear in Windows bottom-right corner and Action Center.
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {enabled && (
            <button
              onClick={handleTestNotification}
              disabled={testSent}
              className="btn btn-sm btn-outline-dark fw-semibold"
              title="Test Windows desktop toast"
            >
              <i className="bi bi-display me-1"></i> {testSent ? 'Sent to Windows!' : 'Test Notification'}
            </button>
          )}

          <div className="form-check form-switch mb-0 ms-2">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="desktopNotifSwitch"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <label className="form-check-label small fw-semibold text-dark" htmlFor="desktopNotifSwitch">
              {enabled ? 'Active' : 'Muted'}
            </label>
          </div>
        </div>
      </div>
    );
  }

  // If dismissed or denied, don't show full prompt banner unless denied instructions requested
  if (dismissed && permission !== 'denied') {
    return null;
  }

  return (
    <div className="border rounded-4 p-3.5 mb-4 shadow-sm bg-white border-warning-subtle">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-start gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-dark flex-shrink-0"
            style={{ width: '42px', height: '42px', backgroundColor: '#FEF3C7' }}
          >
            <i className="bi bi-display fs-5 text-warning"></i>
          </div>
          <div>
            <div className="fw-bold text-dark mb-0.5">
              Enable Windows Desktop Notifications
            </div>
            <p className="text-secondary small mb-0" style={{ maxWidth: '600px' }}>
              Receive instant desktop alerts in your Windows notification panel for new reports, booking updates, and PG staff messages even when looking at other tabs.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {permission === 'denied' ? (
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle p-2 small">
              <i className="bi bi-slash-circle me-1"></i> Blocked by Browser Settings (Click lock icon in URL to allow)
            </span>
          ) : (
            <>
              <button onClick={handleDismiss} className="btn btn-sm btn-light border text-muted">
                Later
              </button>
              <button
                onClick={handleEnable}
                className="btn btn-sm btn-warning text-dark fw-bold d-flex align-items-center gap-1.5 shadow-sm"
              >
                <i className="bi bi-bell-fill"></i>
                <span>Enable Desktop Alerts</span>
              </button>
            </>
          )}
        </div>
      </div>

      {alertMsg && (
        <div className={`alert alert-${alertMsg.type} mt-3 mb-0 py-2 small`}>
          {alertMsg.text}
        </div>
      )}
    </div>
  );
}
