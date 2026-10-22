import React, { useState } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';

export default function AdminLayout() {
  const { user, isAuthenticated, isAdmin, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const navigate = useNavigate();

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

  // Simplified and consolidated 10 navigation items
  const navSections = [
    { to: '/admin/dashboard', icon: 'speedometer2', label: 'Overall', end: true },
    { to: '/admin/rent', icon: 'currency-rupee', label: 'Rent Management' },
    { to: '/admin/rooms', icon: 'building', label: 'Rooms & Beds' },
    { to: '/admin/residents', icon: 'person-badge', label: 'Residents' },
    { to: '/admin/bookings', icon: 'door-open', label: 'Bookings & Visits', aliases: ['/admin/visits'] },
    { to: '/admin/reports', icon: 'exclamation-octagon', label: 'Issue Reports' },
    { to: '/admin/facilities', icon: 'stars', label: 'Facilities & Gallery', aliases: ['/admin/gallery'] },
    { to: '/admin/pg-details', icon: 'pencil-square', label: 'PG Information' },
    { to: '/admin/messages', icon: 'chat-left-dots', label: 'Contact Inquiries' },
    { to: '/admin/profile', icon: 'person-circle', label: 'Admin Profile' },
  ];

  return (
    <div className="d-flex min-vh-100 bg-light position-relative">
      {/* Mobile Backdrop when sidebar drawer is open */}
      {sidebarOpen && (
        <div
          className="admin-mobile-backdrop d-lg-none"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Modern Compact Sidebar (Desktop 230px, Collapsed 68px, Mobile 260px Slide-in Drawer) */}
      <aside
        className={`text-white d-flex flex-column justify-content-between ${
          sidebarOpen ? 'd-flex position-fixed h-100 shadow-lg' : 'd-none d-lg-flex'
        }`}
        style={{
          width: desktopCollapsed ? '68px' : '230px',
          minWidth: desktopCollapsed ? '68px' : '230px',
          maxWidth: desktopCollapsed ? '68px' : '230px',
          backgroundColor: '#0A0F1D', // Deep navy/charcoal background
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 1050,
          position: sidebarOpen ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          bottom: 0,
          height: '100vh',
          transition: 'width 0.2s ease, min-width 0.2s ease, max-width 0.2s ease',
        }}
      >
        <div className="d-flex flex-column h-100 overflow-hidden">
          {/* Compact Brand Header */}
          <div
            className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom border-white border-opacity-10"
            style={{ height: '56px', minHeight: '56px' }}
          >
            <div className="d-flex align-items-center gap-2 overflow-hidden">
              <div
                className="d-flex align-items-center justify-content-center text-white rounded-2 fw-bold flex-shrink-0 shadow-sm"
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                  fontSize: '0.88rem',
                }}
              >
                SL
              </div>
              {!desktopCollapsed && (
                <div className="overflow-hidden">
                  <div className="fw-bold text-white text-truncate lh-sm" style={{ fontSize: '0.84rem' }}>
                    Sri Lakshmi PG
                  </div>
                  <div className="text-white-50 text-truncate" style={{ fontSize: '0.65rem' }}>
                    Admin ERP Panel
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              className="btn btn-sm btn-link text-white-50 p-1 d-lg-none text-decoration-none"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation drawer"
            >
              <i className="bi bi-x-lg fs-5"></i>
            </button>
          </div>

          {/* Navigation Items (Consistent 38px height, compact padding, scrollable) */}
          <nav
            className="nav flex-column gap-1 p-2 flex-grow-1 overflow-y-auto overflow-x-hidden"
            style={{ scrollbarWidth: 'thin' }}
          >
            {navSections.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => {
                  const isCurrentActive =
                    isActive ||
                    (item.aliases && item.aliases.some((alias) => window.location.pathname.startsWith(alias)));
                  return `d-flex align-items-center rounded-2 text-decoration-none transition-all ${
                    desktopCollapsed ? 'justify-content-center px-0' : 'px-2.5 gap-2.5'
                  } ${
                    isCurrentActive
                      ? 'text-white fw-bold shadow-xs'
                      : 'text-light opacity-75 hover-opacity-100 hover-bg-dark'
                  }`;
                }}
                style={({ isActive }) => {
                  const isCurrentActive =
                    isActive ||
                    (item.aliases && item.aliases.some((alias) => window.location.pathname.startsWith(alias)));
                  return {
                    backgroundColor: isCurrentActive ? 'rgba(234, 88, 12, 0.95)' : 'transparent',
                    borderLeft: isCurrentActive ? '3px solid #FDBA74' : '3px solid transparent',
                    height: '38px',
                    minHeight: '38px',
                  };
                }}
                title={desktopCollapsed ? item.label : undefined}
                aria-label={item.label}
              >
                <i className={`bi bi-${item.icon} fs-6 flex-shrink-0`} style={{ width: '18px', textAlign: 'center' }}></i>
                {!desktopCollapsed && (
                  <span className="text-truncate" style={{ fontSize: '0.82rem' }}>
                    {item.label}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Compact Bottom Section: Collapse Toggle, Profile & Logout */}
          <div className="p-2 border-top border-white border-opacity-10 mt-auto bg-black bg-opacity-25 d-flex flex-column gap-1.5">
            {/* Collapse / Expand Toggle Button on Desktop */}
            <button
              type="button"
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className="btn btn-sm text-white-50 hover-text-white w-100 d-none d-lg-flex align-items-center justify-content-center gap-1.5 py-1 rounded-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', height: '30px', fontSize: '0.74rem' }}
              title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <i className={`bi ${desktopCollapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`}></i>
              {!desktopCollapsed && <span>Collapse Menu</span>}
            </button>

            {/* Compact Admin Info & Logout in Single Clean Row */}
            {!desktopCollapsed ? (
              <div className="d-flex align-items-center justify-content-between px-1.5 py-1 bg-white bg-opacity-5 rounded-2">
                <div className="overflow-hidden pe-1" style={{ maxWidth: '135px' }}>
                  <div className="fw-semibold text-white text-truncate lh-1" style={{ fontSize: '0.78rem' }}>
                    {user?.full_name || 'PG Admin'}
                  </div>
                  <span className="text-white-50" style={{ fontSize: '0.64rem' }}>
                    Administrator
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-sm btn-outline-danger p-0 d-flex align-items-center justify-content-center rounded-2"
                  style={{ width: '28px', height: '28px' }}
                  title="Logout"
                  aria-label="Logout"
                >
                  <i className="bi bi-box-arrow-right fs-6"></i>
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-outline-danger p-0 d-flex align-items-center justify-content-center w-100 rounded-2"
                style={{ height: '32px' }}
                title="Logout"
                aria-label="Logout"
              >
                <i className="bi bi-box-arrow-right fs-6"></i>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column overflow-hidden min-vh-100" style={{ minWidth: 0 }}>
        {/* Top Header */}
        <header className="bg-white border-bottom px-3 px-md-4 py-2 d-flex justify-content-between align-items-center sticky-top shadow-xs" style={{ minHeight: '56px' }}>
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button
              className="btn btn-sm btn-outline-dark d-lg-none d-flex align-items-center justify-content-center p-1.5 rounded-2"
              style={{ width: '36px', height: '36px' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation drawer"
            >
              <i className="bi bi-list fs-5"></i>
            </button>
            <div>
              <h5 className="fw-bold mb-0 text-dark" style={{ fontSize: '1rem' }}>
                Sri Lakshmi Srinivasa PG
              </h5>
              <div className="text-muted small d-none d-sm-block" style={{ fontSize: '0.7rem' }}>
                Administrative ERP Portal • Velachery, Chennai
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <NavLink
              to="/"
              target="_blank"
              className="btn btn-sm btn-outline-secondary d-none d-sm-inline-flex align-items-center gap-1.5 py-1 px-2.5"
              style={{ fontSize: '0.8rem' }}
            >
              <i className="bi bi-box-arrow-up-right"></i>
              <span>Public Website</span>
            </NavLink>

            <NavLink
              to="/admin/rent"
              className="btn btn-sm btn-pg-primary d-inline-flex align-items-center gap-1.5 py-1 px-3 shadow-xs"
              style={{ fontSize: '0.8rem' }}
            >
              <i className="bi bi-currency-rupee"></i>
              <span className="d-none d-sm-inline">Rent Portal</span>
            </NavLink>
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
