import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomBar() {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();

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
        className="btn btn-outline-dark d-flex align-items-center justify-content-center gap-1 flex-fill fw-semibold text-decoration-none"
        style={{ minHeight: '44px', fontSize: '0.85rem' }}
      >
        <i className="bi bi-telephone-fill text-success fs-6"></i>
        <span>Call</span>
      </a>

      <button
        onClick={handleVisit}
        className="btn btn-pg-primary d-flex align-items-center justify-content-center gap-1 flex-fill fw-semibold"
        style={{ minHeight: '44px', fontSize: '0.85rem' }}
      >
        <i className="bi bi-calendar2-check fs-6"></i>
        <span>Visit</span>
      </button>

      <button
        onClick={handleBook}
        className="btn btn-dark d-flex align-items-center justify-content-center gap-1 flex-fill fw-semibold"
        style={{ minHeight: '44px', fontSize: '0.85rem' }}
      >
        <i className="bi bi-door-open text-warning fs-6"></i>
        <span>Book</span>
      </button>
    </div>
  );
}
