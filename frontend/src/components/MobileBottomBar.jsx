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
    <div className="mobile-bottom-bar">
      <a
        href="tel:+917893744206"
        className="btn btn-sm btn-outline-dark d-flex align-items-center justify-content-center gap-1 flex-fill py-2 fw-semibold"
        style={{ fontSize: '0.82rem' }}
      >
        <i className="bi bi-telephone-fill text-success"></i>
        <span>Call</span>
      </a>

      <button
        onClick={handleVisit}
        className="btn btn-sm btn-pg-primary d-flex align-items-center justify-content-center gap-1 flex-fill py-2"
        style={{ fontSize: '0.82rem' }}
      >
        <i className="bi bi-calendar2-check"></i>
        <span>Visit</span>
      </button>

      <button
        onClick={handleBook}
        className="btn btn-sm btn-dark d-flex align-items-center justify-content-center gap-1 flex-fill py-2 fw-semibold"
        style={{ fontSize: '0.82rem' }}
      >
        <i className="bi bi-door-open text-warning"></i>
        <span>Book</span>
      </button>
    </div>
  );
}
