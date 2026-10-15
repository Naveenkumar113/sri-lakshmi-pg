import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-4 p-md-5 rounded-4 border shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Notifications & Activity</h3>
          <p className="text-secondary small mb-0">
            Real-time updates regarding your PG visit confirmations, booking decisions, and reminders.
          </p>
        </div>

        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="btn btn-sm btn-outline-secondary"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border">
          <i className="bi bi-bell-slash fs-1 text-muted"></i>
          <h5 className="fw-bold mt-2">No notifications</h5>
          <p className="text-muted small">You are all caught up!</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3 rounded-3 border transition-all ${
                notif.is_read ? 'bg-white opacity-75' : 'bg-light border-primary border-opacity-25'
              }`}
            >
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div className="d-flex align-items-start gap-3">
                  <div
                    className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 ${
                      notif.notification_type === 'VISIT'
                        ? 'bg-primary text-white'
                        : notif.notification_type === 'BOOKING'
                        ? 'bg-warning text-dark'
                        : notif.notification_type === 'REPORT'
                        ? 'bg-danger text-white'
                        : 'bg-info text-white'
                    }`}
                    style={{ width: '38px', height: '38px' }}
                  >
                    <i
                      className={`bi bi-${
                        notif.notification_type === 'VISIT'
                          ? 'calendar-check'
                          : notif.notification_type === 'BOOKING'
                          ? 'key-fill'
                          : notif.notification_type === 'REPORT'
                          ? 'exclamation-octagon'
                          : 'info-circle'
                      }`}
                    ></i>
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1 text-dark">{notif.title}</h6>
                    <p className="small text-secondary mb-2">{notif.message}</p>
                    <div className="d-flex gap-3 align-items-center">
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {new Date(notif.created_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {notif.link && (
                        <Link
                          to={notif.link}
                          onClick={() => {
                            if (!notif.is_read) handleMarkAsRead(notif.id);
                          }}
                          className="small text-decoration-none fw-semibold text-primary"
                        >
                          View Details <i className="bi bi-arrow-right"></i>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
                    title="Mark as read"
                  >
                    <i className="bi bi-check2-all fs-5 text-primary"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
