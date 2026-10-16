import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { processIncomingNotificationsForDesktop, registerServiceWorker } from '../services/desktopNotificationService';

export default function UserLayout() {
  const { user, isAuthenticated, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerServiceWorker();

    const fetchNotificationsAndSync = async () => {
      try {
        const [countRes, listRes] = await Promise.all([
          api.get('/notifications/unread-count'),
          api.get('/notifications'),
        ]);
        setUnreadCount(countRes.data.unread_count || 0);
        // Sync with Windows Desktop Notification API
        processIncomingNotificationsForDesktop(listRes.data || []);
      } catch (err) {
        // silent fail on network glitch
      }
    };

    fetchNotificationsAndSync();
    // Poll unread notification count & desktop sync every 20 seconds
    const interval = setInterval(fetchNotificationsAndSync, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="bg-light min-vh-100 py-3 py-md-4 has-bottom-bar-padding">
      <div className="container px-3 px-md-4">
        {/* User Greeting Bar */}
        <div className="bg-white p-3 p-md-4 rounded-4 border shadow-sm mb-3 mb-md-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold shadow-sm flex-shrink-0"
              style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
                fontSize: '1.2rem',
              }}
            >
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '1.1rem' }}>{user.full_name}</h5>
              <div className="text-muted small">
                {user.occupation || 'Resident / Guest'} • {user.phone}
              </div>
            </div>
          </div>

          <div className="d-flex gap-2 w-100 w-sm-auto justify-content-end">
            <NavLink to="/visit-request" className="btn btn-sm btn-outline-dark fw-semibold flex-fill flex-sm-grow-0 d-flex align-items-center justify-content-center" style={{ minHeight: '40px' }}>
              <i className="bi bi-calendar2-plus me-1"></i> Visit
            </NavLink>
            <NavLink to="/book-room" className="btn btn-sm btn-pg-primary fw-semibold flex-fill flex-sm-grow-0 d-flex align-items-center justify-content-center" style={{ minHeight: '40px' }}>
              <i className="bi bi-key-fill me-1"></i> Book Room
            </NavLink>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Tabs (< lg screens) */}
        <div className="d-lg-none mb-3">
          <div className="user-mobile-nav-pills">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-grid me-1"></i> Dashboard
            </NavLink>

            <NavLink
              to="/my-visits"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-calendar-check me-1"></i> Visits
            </NavLink>

            <NavLink
              to="/my-bookings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-door-open me-1"></i> Bookings
            </NavLink>

            <NavLink
              to="/notifications"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-bell me-1"></i> Alerts
              {unreadCount > 0 && (
                <span className="badge bg-danger rounded-pill ms-1" style={{ fontSize: '0.65rem' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/report"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-exclamation-octagon me-1"></i> Report Issue
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <i className="bi bi-person-gear me-1"></i> Profile
            </NavLink>
          </div>
        </div>

        <div className="row g-3 g-md-4">
          {/* Desktop Sidebar Navigation */}
          <div className="col-lg-3 d-none d-lg-block">
            <div className="bg-white rounded-4 border shadow-sm p-3">
              <div className="text-uppercase small fw-bold text-muted px-3 py-2" style={{ letterSpacing: '0.05em' }}>
                User Portal
              </div>
              <nav className="nav flex-column gap-1">
                <NavLink
                  to="/dashboard"
                  end
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-grid fs-5"></i>
                  <span>Dashboard</span>
                </NavLink>

                <NavLink
                  to="/my-visits"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-calendar-check fs-5"></i>
                  <span>My Visits</span>
                </NavLink>

                <NavLink
                  to="/my-bookings"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-door-open fs-5"></i>
                  <span>My Bookings</span>
                </NavLink>

                <NavLink
                  to="/notifications"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="position-relative d-inline-flex align-items-center">
                    <i className="bi bi-bell fs-5"></i>
                    {unreadCount > 0 && (
                      <span
                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                        style={{ fontSize: '0.65rem' }}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="ms-1">Notifications</span>
                </NavLink>

                <NavLink
                  to="/report"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-exclamation-octagon fs-5"></i>
                  <span>Report</span>
                </NavLink>

                <NavLink
                  to="/profile"
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <i className="bi bi-person-gear fs-5"></i>
                  <span>My Profile</span>
                </NavLink>
              </nav>

              <hr className="my-3" />

              <div className="p-3 bg-light rounded-3">
                <div className="small fw-bold text-dark mb-1">
                  <i className="bi bi-headset text-primary me-1"></i> Need Help?
                </div>
                <div className="text-muted small mb-2">
                  Call the PG manager directly:
                </div>
                <a href="tel:+917893744206" className="fw-bold text-dark small text-decoration-none d-block">
                  +91 78937 44206
                </a>
              </div>
            </div>
          </div>

          {/* Main Content Body */}
          <div className="col-lg-9">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
