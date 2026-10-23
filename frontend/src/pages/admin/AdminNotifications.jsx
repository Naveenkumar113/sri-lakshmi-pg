import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import NotificationPermissionBanner from '../../components/NotificationPermissionBanner';
import TablePagination from '../../components/TablePagination';

export default function AdminNotifications() {
  const { markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead, refreshNotifications } = useNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters & Pagination
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, UNREAD, REPORT, BOOKING, VISIT
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {
        paginated: true,
        page,
        limit: pageSize,
      };

      if (activeTab === 'UNREAD') {
        params.unread_only = true;
      } else if (activeTab !== 'ALL') {
        params.notification_type = activeTab;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const res = await api.get('/notifications', { params });
      if (res.data && res.data.items) {
        setNotifications(res.data.items);
        setTotalCount(res.data.total);
        setUnreadCount(res.data.unread_count);
      } else if (Array.isArray(res.data)) {
        setNotifications(res.data);
        setTotalCount(res.data.length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activeTab, page, pageSize]);

  // Handle Search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchNotifications();
  };

  const handleMarkAsRead = async (id) => {
    try {
      await contextMarkAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await contextMarkAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold mb-0 text-dark">Administrative Notification Center</h4>
            {unreadCount > 0 && (
              <span className="badge bg-danger rounded-pill px-2.5 py-1" style={{ fontSize: '0.78rem' }}>
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-secondary small mb-0 mt-1">
            Real-time activity log for resident issue reports, bookings, visits, and tenant communications.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1.5 px-3 py-1.5 rounded-2 fw-semibold"
            >
              <i className="bi bi-check2-all fs-6"></i>
              <span>Mark All as Read</span>
            </button>
          )}

          <button
            onClick={fetchNotifications}
            className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1.5 px-2.5 py-1.5 rounded-2 text-secondary"
            title="Refresh list"
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
            <span className="d-none d-sm-inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Desktop & Mobile Push Notification Banner */}
      <NotificationPermissionBanner />

      {/* Search & Tabs Controls */}
      <div className="row g-3 align-items-center mb-4">
        {/* Filter Tabs */}
        <div className="col-12 col-lg-8">
          <div className="d-flex flex-wrap gap-1.5 bg-light p-1.5 rounded-3 border">
            {[
              { id: 'ALL', label: 'All Alerts', icon: 'collection' },
              { id: 'UNREAD', label: `Unread (${unreadCount})`, icon: 'bell-fill' },
              { id: 'REPORT', label: 'Issue Reports', icon: 'exclamation-octagon' },
              { id: 'BOOKING', label: 'Bookings', icon: 'door-open' },
              { id: 'VISIT', label: 'Visits', icon: 'calendar-check' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`btn btn-sm d-inline-flex align-items-center gap-1.5 px-3 py-1.5 rounded-2 fw-semibold transition-all ${
                  activeTab === tab.id
                    ? 'btn-white bg-white text-dark shadow-xs border'
                    : 'btn-link text-secondary text-decoration-none hover-text-dark'
                }`}
                style={{ fontSize: '0.8rem' }}
              >
                <i className={`bi bi-${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="col-12 col-lg-4">
          <form onSubmit={handleSearchSubmit}>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search resident, room, or issue..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => {
                    setSearchTerm('');
                    setPage(1);
                    fetchNotifications();
                  }}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
              <button type="submit" className="btn btn-primary px-3">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
          <span className="text-muted small">Loading notifications...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border">
          <div
            className="rounded-circle bg-white shadow-xs d-inline-flex align-items-center justify-content-center text-muted mb-2"
            style={{ width: '56px', height: '56px' }}
          >
            <i className="bi bi-bell-slash fs-3"></i>
          </div>
          <h6 className="fw-bold mt-2 text-dark">No notifications found</h6>
          <p className="text-secondary small mb-0">
            {searchTerm || activeTab !== 'ALL'
              ? 'Try adjusting your search query or switching filter tabs.'
              : 'You are all caught up! No administrative alerts to display.'}
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2.5">
          {notifications.map((notif) => {
            const isReport = notif.notification_type === 'REPORT';
            const isBooking = notif.notification_type === 'BOOKING';
            const isVisit = notif.notification_type === 'VISIT';

            return (
              <div
                key={notif.id}
                className={`p-3 p-md-3.5 rounded-3 border transition-all ${
                  notif.is_read
                    ? 'bg-white opacity-95'
                    : 'bg-light border-warning border-opacity-60 shadow-xs'
                }`}
                style={{
                  borderLeftWidth: !notif.is_read ? '4px' : '1px',
                  borderLeftColor: !notif.is_read ? '#EA580C' : undefined,
                }}
              >
                <div className="d-flex justify-content-between align-items-start gap-3">
                  <div className="d-flex align-items-start gap-3 flex-grow-1 min-w-0">
                    {/* Notification Type Icon */}
                    <div
                      className={`d-flex align-items-center justify-content-center rounded-circle flex-shrink-0 text-white ${
                        isReport
                          ? 'bg-danger shadow-xs'
                          : isBooking
                          ? 'bg-warning text-dark'
                          : isVisit
                          ? 'bg-primary text-white'
                          : 'bg-info text-white'
                      }`}
                      style={{ width: '42px', height: '42px' }}
                    >
                      <i
                        className={`bi bi-${
                          isReport
                            ? 'exclamation-octagon-fill'
                            : isBooking
                            ? 'door-open-fill'
                            : isVisit
                            ? 'calendar-check-fill'
                            : 'envelope-paper-fill'
                        } fs-5`}
                      ></i>
                    </div>

                    {/* Notification Text and Meta */}
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <h6 className="fw-bold mb-0 text-dark text-truncate" style={{ fontSize: '0.92rem' }}>
                          {notif.title}
                        </h6>

                        {/* Badges */}
                        <span
                          className={`badge rounded-pill ${
                            isReport
                              ? 'bg-danger bg-opacity-10 text-danger'
                              : isBooking
                              ? 'bg-warning bg-opacity-10 text-warning-emphasis'
                              : 'bg-primary bg-opacity-10 text-primary'
                          }`}
                          style={{ fontSize: '0.68rem' }}
                        >
                          {notif.notification_type}
                        </span>

                        {!notif.is_read && (
                          <span className="badge bg-warning text-dark rounded-pill" style={{ fontSize: '0.65rem' }}>
                            NEW
                          </span>
                        )}
                      </div>

                      <p className="small text-secondary mb-2 lh-base" style={{ fontSize: '0.82rem' }}>
                        {notif.message}
                      </p>

                      <div className="d-flex flex-wrap gap-3 align-items-center">
                        <span className="text-muted d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-clock"></i>
                          {new Date(notif.created_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>

                        {notif.link && (
                          <Link
                            to={notif.link}
                            onClick={() => {
                              if (!notif.is_read) handleMarkAsRead(notif.id);
                            }}
                            className="btn btn-sm btn-pg-primary py-0.5 px-2.5 text-decoration-none fw-semibold d-inline-flex align-items-center gap-1 shadow-xs"
                            style={{ fontSize: '0.75rem' }}
                          >
                            <span>Open Issue & Manage</span>
                            <i className="bi bi-arrow-right"></i>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 d-flex align-items-center gap-1">
                    {!notif.is_read ? (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 py-1 px-2.5 rounded-2"
                        title="Mark as read"
                        style={{ fontSize: '0.75rem' }}
                      >
                        <i className="bi bi-check2 text-primary fs-6"></i>
                        <span className="d-none d-md-inline">Mark Read</span>
                      </button>
                    ) : (
                      <span className="text-muted small" title="Read" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-check2-all text-success fs-5"></i>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalCount > pageSize && (
        <div className="mt-4 pt-3 border-top d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
          <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
            Showing <strong>{(page - 1) * pageSize + 1}</strong> -{' '}
            <strong>{Math.min(page * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> notifications
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="bi bi-chevron-left me-1"></i>Previous
            </button>

            <span className="text-secondary small px-2">
              Page {page} of {totalPages}
            </span>

            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next<i className="bi bi-chevron-right ms-1"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
