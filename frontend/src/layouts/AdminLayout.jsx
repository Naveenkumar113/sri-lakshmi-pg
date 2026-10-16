import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import api from '../services/api';
import { processIncomingNotificationsForDesktop, registerServiceWorker } from '../services/desktopNotificationService';

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

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
        // silent fail
      }
    };

    fetchNotificationsAndSync();
    const interval = setInterval(fetchNotificationsAndSync, 15000); // 15-second polling for admin alerts
    return () => clearInterval(interval);
  }, [isAuthenticated, isAdmin]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  // Guard: Protect all admin routes
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace state={{ returnUrl: '/admin/dashboard' }} />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/admin/dashboard', icon: 'speedometer2', label: 'Dashboard', end: true },
    { to: '/admin/rooms', icon: 'building', label: 'Room & Bed Management' },
    { to: '/admin/residents', icon: 'person-badge', label: 'Residents' },
    { to: '/admin/rent', icon: 'currency-rupee', label: 'Rent Management' },
    { to: '/admin/bookings', icon: 'door-open', label: 'Bookings' },
    { to: '/admin/visits', icon: 'calendar-check', label: 'Visit Requests' },
    { to: '/admin/users', icon: 'people', label: 'Registered Users' },
    { to: '/admin/facilities', icon: 'stars', label: 'Facilities' },
    { to: '/admin/gallery', icon: 'images', label: 'Gallery' },
    { to: '/admin/pg-details', icon: 'pencil-square', label: 'PG Information' },
    { to: '/admin/messages', icon: 'chat-left-dots', label: 'Contact Inquiries' },
    { to: '/admin/reports', icon: 'exclamation-octagon', label: 'Issue Reports' },
    { to: '/admin/notifications', icon: 'bell', label: 'Notifications' },
    { to: '/admin/profile', icon: 'person-circle', label: 'Admin Profile' },
    { to: '/admin/settings', icon: 'gear', label: 'Settings & Slots' },
  ];


  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Mobile Backdrop when sidebar is open */}
      {sidebarOpen && (
        <div
          className="admin-mobile-backdrop d-lg-none"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Desktop & Mobile Offcanvas */}
      <aside
        className={`bg-dark text-white border-end d-flex flex-column justify-content-between p-3 ${
          sidebarOpen ? 'd-flex position-fixed h-100 shadow-lg' : 'd-none d-lg-flex'
        }`}
        style={{
          width: '280px',
          maxWidth: '85vw',
          backgroundColor: '#0F172A',
          zIndex: 1050,
          top: 0,
          left: 0,
          bottom: 0,
        }}
      >
        <div>
          {/* Admin Header */}
          <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom border-secondary border-opacity-25">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center text-white rounded-3 fw-bold"
                style={{ width: '38px', height: '38px', backgroundColor: '#EA580C' }}
              >
                PG
              </div>
              <div>
                <div className="fw-bold text-white small lh-1">SRI LAKSHMI</div>
                <div className="text-white-50" style={{ fontSize: '0.68rem' }}>ADMIN ERP PANEL</div>
              </div>
            </div>
            <button
              className="btn btn-sm btn-outline-light d-lg-none p-2"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <i className="bi bi-x-lg fs-5"></i>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="nav flex-column gap-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 170px)' }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `d-flex align-items-center justify-content-between px-3 py-2.5 rounded-3 text-decoration-none transition-all ${
                    isActive
                      ? 'bg-warning text-dark fw-bold shadow-sm'
                      : 'text-light opacity-75 hover-bg-dark hover-opacity-100'
                  }`
                }
                style={{ minHeight: '44px' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi bi-${item.icon} fs-5`}></i>
                  <span className="small">{item.label}</span>
                </div>
                {item.to === '/admin/notifications' && unreadCount > 0 && (
                  <span className="badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="pt-3 border-top border-secondary border-opacity-25">
          <div className="small text-white-50 mb-2 truncate">
            {user.full_name}
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2"
            style={{ minHeight: '44px' }}
          >
            <i className="bi bi-box-arrow-right"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden min-vh-100">
        {/* Top Header */}
        <header className="bg-white border-bottom px-3 px-md-4 py-2.5 py-md-3 d-flex justify-content-between align-items-center sticky-top shadow-xs">
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button
              className="btn btn-outline-dark d-lg-none d-flex align-items-center justify-content-center p-2"
              style={{ width: '42px', height: '42px' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              <i className="bi bi-list fs-4"></i>
            </button>
            <div>
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.05rem' }}>PG Admin</h5>
              <div className="text-muted d-sm-none" style={{ fontSize: '0.7rem' }}>Sri Lakshmi Srinivasa</div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <NavLink to="/" target="_blank" className="btn btn-sm btn-outline-secondary d-none d-sm-inline-flex align-items-center gap-1">
              <i className="bi bi-box-arrow-up-right"></i>
              <span>Public Website</span>
            </NavLink>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Main Routed Page */}
        <main className="p-2 p-sm-3 p-md-4 flex-grow-1 overflow-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
