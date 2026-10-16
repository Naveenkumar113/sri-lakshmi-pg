import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { processIncomingNotificationsForDesktop, registerServiceWorker } from '../services/desktopNotificationService';

export default function UserLayout() {
  const { user, isAuthenticated, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const location = useLocation();
  const navTrackRef = useRef(null);

  const NAV_ITEMS = [
    { path: '/dashboard', label: 'Dashboard', icon: 'bi-grid', exact: true, desc: 'Overview & quick actions' },
    { path: '/my-visits', label: 'Visits', icon: 'bi-calendar-check', exact: false, desc: 'Scheduled PG viewings' },
    { path: '/my-bookings', label: 'Bookings', icon: 'bi-door-open', exact: false, desc: 'Room requests & allocations' },
    { path: '/report', label: 'Issue Reports', icon: 'bi-exclamation-octagon', exact: false, desc: 'Maintenance & room complaints' },
    { path: '/notifications', label: 'Alerts', icon: 'bi-bell', exact: false, desc: 'PG announcements & updates', badge: unreadCount },
    { path: '/profile', label: 'Profile', icon: 'bi-person-gear', exact: false, desc: 'Resident info & password' },
  ];

  // Auto-scroll active item to center of track whenever route changes
  useEffect(() => {
    if (!navTrackRef.current) return;
    const track = navTrackRef.current;
    const activeEl = track.querySelector('.center-nav-item.active');
    if (activeEl) {
      const trackWidth = track.offsetWidth;
      const elOffsetLeft = activeEl.offsetLeft;
      const elWidth = activeEl.offsetWidth;
      const targetScrollLeft = elOffsetLeft - (trackWidth / 2) + (elWidth / 2);

      track.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });
    }
  }, [location.pathname]);

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
    <div className="bg-light min-vh-100 py-2.5 py-md-4">
      <div className="container px-2.5 px-md-4">
        {/* User Greeting Bar - Clean, Compact & Purposeful */}
        <div className="bg-white p-3 p-md-3.5 rounded-3 border shadow-xs mb-2.5 mb-md-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2.5">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold shadow-xs flex-shrink-0"
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)',
                fontSize: '1.05rem',
              }}
            >
              {user.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h6 className="fw-bold text-dark mb-0">{user.full_name}</h6>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle small py-0.5 px-1.5" style={{ fontSize: '0.65rem' }}>
                  Resident
                </span>
              </div>
              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                {user.phone ? `+91 ${user.phone}` : user.email}
              </div>
            </div>
          </div>

          <div className="d-flex gap-1.5 ms-auto">
            <NavLink
              to="/profile"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 px-2.5 py-1.5"
              style={{ minHeight: '34px', fontSize: '0.8rem' }}
              title="Account Settings"
            >
              <i className="bi bi-person-gear"></i>
              <span className="d-none d-sm-inline">Profile</span>
            </NavLink>
          </div>
        </div>

        {/* Mobile Center-Active Navigation Bar (< lg screens) */}
        <div className="d-lg-none mb-3">
          <div className="center-active-nav-container">
            <button
              type="button"
              className="btn btn-sm btn-light border d-flex align-items-center justify-content-center p-2 rounded-circle flex-shrink-0"
              style={{ width: '38px', height: '38px' }}
              onClick={() => setShowAllFeatures(true)}
              title="All Features Menu"
              aria-label="View all features"
            >
              <i className="bi bi-grid-3x3-gap-fill text-primary" style={{ fontSize: '1rem' }}></i>
            </button>

            <div
              className="center-active-nav-track"
              ref={navTrackRef}
            >
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    data-nav-path={item.path}
                    className={`center-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <i className={`bi ${item.icon}`}></i>
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span className={`badge rounded-pill ms-1 ${isActive ? 'bg-white text-dark' : 'bg-danger text-white'}`} style={{ fontSize: '0.62rem' }}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            <button
              type="button"
              className="btn btn-sm btn-light border-0 text-muted px-2 py-1 rounded-pill flex-shrink-0 d-flex align-items-center gap-1"
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
              onClick={() => setShowAllFeatures(true)}
            >
              <span>All</span>
              <i className="bi bi-chevron-right" style={{ fontSize: '0.7rem' }}></i>
            </button>
          </div>
        </div>

        {/* All Features Grid Modal (< lg screens) */}
        {showAllFeatures && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1065 }}
            onClick={() => setShowAllFeatures(false)}
          >
            <div
              className="modal-dialog modal-dialog-centered px-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content rounded-4 border-0 shadow-xl overflow-hidden">
                <div className="modal-header border-bottom p-3 bg-light">
                  <div className="d-flex align-items-center gap-2">
                    <div className="p-1.5 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                      <i className="bi bi-grid-3x3-gap-fill" style={{ fontSize: '0.85rem' }}></i>
                    </div>
                    <div>
                      <h6 className="modal-title fw-bold mb-0">All Resident Features</h6>
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>Jump directly to any dashboard section</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAllFeatures(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <div className="modal-body p-3">
                  <div className="all-features-grid">
                    {NAV_ITEMS.map((item) => {
                      const isActive = item.exact
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.exact}
                          onClick={() => setShowAllFeatures(false)}
                          className={`feature-grid-card ${isActive ? 'active' : ''}`}
                        >
                          <div className="d-flex align-items-center justify-content-between w-100 mb-2">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: '36px',
                                height: '36px',
                                background: isActive ? 'var(--accent)' : 'rgba(15, 23, 42, 0.06)',
                                color: isActive ? '#FFFFFF' : 'var(--text-main)',
                              }}
                            >
                              <i className={`bi ${item.icon} fs-6`}></i>
                            </div>
                            {item.badge > 0 && (
                              <span className="badge bg-danger rounded-pill" style={{ fontSize: '0.65rem' }}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="fw-bold small text-dark mb-0.5">{item.label}</div>
                          <div className="text-muted" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
                            {item.desc}
                          </div>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>

                <div className="modal-footer bg-light p-2.5">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary w-100 py-2 fw-semibold"
                    onClick={() => setShowAllFeatures(false)}
                  >
                    Close Menu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
