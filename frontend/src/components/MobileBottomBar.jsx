import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomBar() {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Auto-hide when virtual keyboard opens on mobile to prevent obstruction
  useEffect(() => {
    const handleFocusIn = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
        setIsKeyboardVisible(true);
      }
    };
    const handleFocusOut = () => {
      setIsKeyboardVisible(false);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Hide the public sticky bottom bar on resident portal, report forms, booking flows, and admin pages
  const hiddenPaths = [
    '/dashboard',
    '/report',
    '/my-visits',
    '/my-bookings',
    '/visit-request',
    '/book-room',
    '/profile',
    '/notifications',
    '/login',
    '/register',
    '/forgot-password'
  ];

  const shouldHide =
    isKeyboardVisible ||
    hiddenPaths.some((p) => location.pathname === p || location.pathname.startsWith('/admin'));

  if (shouldHide) {
    return null;
  }

  const handleVisit = () => {
    if (requireAuth('Schedule a Visit', '/visit-request')) {
      navigate('/visit-request');
    }
  };

  const handleBook = () => {
    if (requireAuth('Book a Room', '/book-room')) {
      navigate('/book-room');
    }
  };

  return (
    <div className="mobile-bottom-bar" style={{ zIndex: 1040 }}>
      <a
        href="tel:+917893744206"
        className="btn btn-outline-dark d-flex align-items-center justify-content-center gap-1.5 flex-fill py-1 px-2 border text-decoration-none shadow-none"
        style={{ minHeight: '38px', fontSize: '0.82rem', borderRadius: '8px' }}
      >
        <i className="bi bi-telephone-fill text-success" style={{ fontSize: '0.88rem' }}></i>
        <span className="fw-semibold">Call</span>
      </a>

      <button
        onClick={handleVisit}
        className="btn btn-pg-primary d-flex align-items-center justify-content-center gap-1.5 flex-fill py-1 px-2 shadow-none"
        style={{ minHeight: '38px', fontSize: '0.82rem', borderRadius: '8px' }}
      >
        <i className="bi bi-calendar2-check" style={{ fontSize: '0.88rem' }}></i>
        <span className="fw-semibold">Visit</span>
      </button>

      <button
        onClick={handleBook}
        className="btn btn-dark d-flex align-items-center justify-content-center gap-1.5 flex-fill py-1 px-2 shadow-none"
        style={{ minHeight: '38px', fontSize: '0.82rem', borderRadius: '8px' }}
      >
        <i className="bi bi-door-open text-warning" style={{ fontSize: '0.88rem' }}></i>
        <span className="fw-semibold">Book</span>
      </button>
    </div>
  );
}
