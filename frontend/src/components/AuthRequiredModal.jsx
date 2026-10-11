import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthRequiredModal() {
  const { authPromptOpen, authPromptAction, pendingRedirect, closeAuthPrompt } = useAuth();
  const navigate = useNavigate();

  if (!authPromptOpen) return null;

  const handleLogin = () => {
    closeAuthPrompt();
    navigate('/login', { state: { returnUrl: pendingRedirect } });
  };

  const handleRegister = () => {
    closeAuthPrompt();
    navigate('/register', { state: { returnUrl: pendingRedirect } });
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)', zIndex: 1060 }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Header */}
          <div className="modal-header border-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: '42px', height: '42px', backgroundColor: '#FFF7ED', color: '#EA580C' }}
              >
                <i className="bi bi-shield-lock-fill fs-5"></i>
              </div>
              <h5 className="modal-title fw-bold mb-0">Login Required</h5>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={closeAuthPrompt}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body px-4 py-3">
            <p className="text-secondary fs-6 mb-2">
              Please login or create an account to <strong className="text-dark">{authPromptAction.toLowerCase()}</strong>.
            </p>
            <p className="text-muted small mb-0">
              Your free account enables you to manage your visit schedule, receive instant room confirmation updates, and view manager notes.
            </p>
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 px-4 pb-4 pt-2 d-flex gap-2">
            <button
              type="button"
              className="btn btn-pg-secondary flex-fill py-2"
              onClick={handleLogin}
            >
              <i className="bi bi-box-arrow-in-right me-1"></i>
              Login
            </button>
            <button
              type="button"
              className="btn btn-pg-primary flex-fill py-2"
              onClick={handleRegister}
            >
              <i className="bi bi-person-plus-fill me-1"></i>
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
